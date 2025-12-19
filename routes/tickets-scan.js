const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const mongo = require("../utils/mongoClient");

console.log("🔥 tickets-scan.js LOADED");

/* ------------------ DB ------------------ */
async function getDb() {
  if (!mongo || typeof mongo.getDb !== "function") {
    throw new Error("mongoClient not available");
  }
  const db = mongo.getDb();
  return typeof db?.then === "function" ? await db : db;
}

/* ------------------ helpers ------------------ */
function tryParseJsonSafe(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}

function looksLikeBase64(s) {
  return typeof s === "string"
    && /^[A-Za-z0-9+/=]+$/.test(s.replace(/\s+/g, ""))
    && s.length % 4 === 0;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Attempts to extract a ticket id from a nested object.
   Prefers explicit keys, then falls back to deeper scanning.
*/
function extractTicketIdFromObject(obj) {
  if (!obj || typeof obj !== "object") return null;
  const keys = [
    "ticket_code","ticketCode",
    "ticket_id","ticketId",
    "ticket","ticketNo","ticketno","ticketid",
    "code","c","id","tk","t"
  ];
  // preferred keys first
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    // also try snake_case variant
    const snake = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(obj, snake)) {
      const v = obj[snake];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
  }

  // stack-based deep scan (avoid recursion)
  const stack = [obj];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      const s = String(node).trim();
      if (s) return s;
      if (typeof node === "string") {
        const parsed = tryParseJsonSafe(node);
        if (parsed && typeof parsed === "object") stack.push(parsed);
        else if (looksLikeBase64(node)) {
          try {
            const dec = Buffer.from(node, "base64").toString("utf8");
            const p2 = tryParseJsonSafe(dec);
            if (p2 && typeof p2 === "object") stack.push(p2);
            else if (dec && dec.trim()) return dec.trim();
          } catch (e) {}
        }
      }
      continue;
    }

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) stack.push(node[i]);
      continue;
    }

    if (typeof node === "object") {
      for (const key of Object.keys(node)) {
        const v = node[key];
        if (v === null || v === undefined) continue;
        stack.push(v);
      }
    }
  }
  return null;
}

/* Normalise input into a ticket id string (supports tokens, numeric substrings, JSON, base64 JSON) */
function extractTicketId(input) {
  if (input === undefined || input === null) return null;

  if (typeof input === "number") return String(input);

  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;

    // JSON string
    const parsed = tryParseJsonSafe(s);
    if (parsed && typeof parsed === "object") {
      const f = extractTicketIdFromObject(parsed);
      if (f) return f;
    }

    // base64 encoded JSON or token
    if (looksLikeBase64(s)) {
      try {
        const dec = Buffer.from(s, "base64").toString("utf8");
        const p2 = tryParseJsonSafe(dec);
        if (p2 && typeof p2 === "object") {
          const f2 = extractTicketIdFromObject(p2);
          if (f2) return f2;
        }
        // fallback token/digits from decoded string
        const tokenDec = dec.match(/[A-Za-z0-9._-]{3,64}/);
        if (tokenDec) return tokenDec[0];
        const digDec = dec.match(/\d{3,12}/);
        if (digDec) return digDec[0];
      } catch (e) { /* ignore */ }
    }

    // token-like (alphanumeric with -._)
    const token = s.match(/[A-Za-z0-9._-]{3,64}/);
    if (token) return token[0];

    // numeric substring fallback
    const m = s.match(/\d{3,12}/);
    if (m) return m[0];

    return null;
  }

  if (typeof input === "object") {
    const f = extractTicketIdFromObject(input);
    if (f) return f;
    return null;
  }

  return null;
}

/* ------------------ ticket lookup ------------------ */

const COLLECTIONS = ["visitors","exhibitors","partners","speakers","awardees"];
const CANDIDATE_FIELDS = ["ticket_code","ticket_code_num","ticketCode","ticket_id","ticketId","ticket","ticketNo","ticketno","ticketid","code","c","id","tk","t"];

/* findTicket:
   - tries exact ticket_code (string),
   - tries ticket_code_num if numeric,
   - tries candidate fields with exact and case-insensitive anchored regex,
   - falls back to scanning documents that have candidate fields or _rawForm (limited).
*/
async function findTicket(ticketCode) {
  const db = await getDb();
  const codeStr = String(ticketCode);
  const codeNum = Number(codeStr);

  for (const coll of COLLECTIONS) {
    const doc = await db.collection(coll).findOne({
      $or: [
        { ticket_code: codeStr },
        { ticket_code_num: codeNum }
      ]
    });
    if (doc) return { doc, collection: coll };
  }
  return null;
}

/* ------------------ routes ------------------ */

router.get("/__ping", (req, res) => {
  res.json({ ok: true, router: "tickets-scan" });
});

router.post("/validate", express.json(), async (req, res) => {
  try {
    const raw = req.body?.ticketId;
    if (raw === undefined || raw === null) {
      return res.status(400).json({ success: false, error: "Missing ticketId" });
    }

    const ticketCode = String(raw).trim();
    if (!/^\d+$/.test(ticketCode)) {
      return res.status(400).json({ success: false, error: "Invalid ticket_code" });
    }

    const found = await findTicket(ticketCode);
    if (!found) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const { doc, collection } = found;

    res.json({
      success: true,
      ticket: {
        ticket_code: doc.ticket_code,   // ✅ name is ticket_code
        entity_type: collection,
        name: doc.name || "",
        email: doc.email || "",
        company: doc.company || "",
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});


const QRCode = require("qrcode");

router.post("/scan", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const incoming = req.body?.ticketId !== undefined ? req.body.ticketId : req.body?.raw;
    const ticketKey = extractTicketId(incoming);
    if (!ticketKey) {
      return res.status(400).json({ error: "Invalid ticket" });
    }

    const found = await findTicket(ticketKey);
    if (!found) {
      return res.status(404).json({ error: "Not found" });
    }

    const { doc } = found;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ticket-${ticketKey}.pdf`);

    const pdf = new PDFDocument({ size: [300, 450], margin: 20 });
    pdf.pipe(res);

    // Title
    pdf.fontSize(18).font("Helvetica-Bold").text("RailTrans Expo 2026", { align: "center" });
    pdf.moveDown(1);

    // Only show Name
    pdf.fontSize(16).font("Helvetica-Bold").text(doc.name || "", { align: "center" });
    pdf.moveDown(1);

    // Generate QR code data URL with ticketKey encoded
    const qrDataUrl = await QRCode.toDataURL(ticketKey);

    // Decode base64 image part and embed in PDF
    const qrImageBase64 = qrDataUrl.split(",")[1];
    const qrImageBuffer = Buffer.from(qrImageBase64, "base64");

    // Add QR code image centered
    const qrSize = 180;
    const qrX = (pdf.page.width - qrSize) / 2;
    pdf.image(qrImageBuffer, qrX, pdf.y, { width: qrSize, height: qrSize });
    pdf.moveDown(1.5);

    // Optional small text below QR code
    pdf.fontSize(10).font("Helvetica-Oblique").fillColor("gray").text("Scan at entry", { align: "center" });

    pdf.moveDown(3);

    // Footer text like "FREE"
    pdf.fontSize(24).font("Helvetica-Bold").fillColor("green").text("FREE", { align: "center" });

    pdf.end();

  } catch (e) {
    console.error("tickets-scan scan error:", e && (e.stack || e));
    res.status(500).json({ error: "Server error" });
  }
});



/* debug-check - returns diagnostics about where it checked (helpful when scanning fails) */
router.post("/debug-check", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const incoming = req.body?.ticketId !== undefined ? req.body.ticketId : req.body?.raw;
    const ticketKey = extractTicketId(incoming);
    if (!ticketKey) return res.status(400).json({ success: false, error: "Invalid ticket" });

    const db = await getDb();
    const debug = { ticketKey, checkedCollections: [] };

    for (const collName of COLLECTIONS) {
      const col = db.collection(collName);
      const sample = await col.findOne({});
      debug.checkedCollections.push({ coll: collName, sampleHasTicketCode: !!(sample && (sample.ticket_code || sample.ticketId || sample.code || sample._rawForm)) });
    }

    return res.json({ success: true, debug });
  } catch (err) {
    console.error("tickets-scan debug-check error:", err && (err.stack || err));
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;