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
  try { return JSON.parse(s); } catch { return null; }
}

function looksLikeBase64(s) {
  return typeof s === "string"
    && /^[A-Za-z0-9+/=]+$/.test(s.replace(/\s+/g, ""))
    && s.length % 4 === 0;
}

function extractTicketIdFromObject(obj) {
  if (!obj || typeof obj !== "object") return null;
  const keys = [
    "ticket_code","ticketCode",
    "ticket_id","ticketId",
    "ticket","code","id","tk","t"
  ];
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim()) {
      return String(obj[k]).trim();
    }
  }
  return null;
}

function extractTicketId(input) {
  if (input == null) return null;

  if (typeof input === "number") return String(input);

  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;

    const parsed = tryParseJsonSafe(s);
    if (parsed) {
      const f = extractTicketIdFromObject(parsed);
      if (f) return f;
    }

    if (looksLikeBase64(s)) {
      try {
        const dec = Buffer.from(s, "base64").toString("utf8");
        const p2 = tryParseJsonSafe(dec);
        if (p2) {
          const f2 = extractTicketIdFromObject(p2);
          if (f2) return f2;
        }
      } catch {}
    }

    const token = s.match(/[A-Za-z0-9._-]{3,64}/);
    if (token) return token[0];
  }

  if (typeof input === "object") {
    return extractTicketIdFromObject(input);
  }

  return null;
}

/* ------------------ ticket lookup ------------------ */
const COLLECTIONS = ["visitors","exhibitors","partners","speakers","awardees"];

async function findTicket(ticketCode) {
  const db = await getDb();
  for (const name of COLLECTIONS) {
    const doc = await db.collection(name).findOne({ ticket_code: ticketCode });
    if (doc) return { doc, collection: name };
  }
  return null;
}

/* ------------------ routes ------------------ */
router.get("/__ping", (req, res) => {
  res.json({ ok: true, router: "tickets-scan" });
});

router.post("/validate", async (req, res) => {
  try {
    const ticketKey = extractTicketId(req.body?.ticketId);
    if (!ticketKey) {
      return res.status(400).json({ success: false, error: "Invalid ticket" });
    }

    const found = await findTicket(ticketKey);
    if (!found) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const { doc, collection } = found;

    res.json({
      success: true,
      ticket: {
        ticket_code: doc.ticket_code,
        entity_type: collection,
        name: doc.name || doc.full_name || "",
        email: doc.email || "",
        company: doc.company || doc.org || "",
        category: doc.category || ""
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/scan", async (req, res) => {
  try {
    const ticketKey = extractTicketId(req.body?.ticketId);
    if (!ticketKey) return res.status(400).json({ error: "Invalid ticket" });

    const found = await findTicket(ticketKey);
    if (!found) return res.status(404).json({ error: "Not found" });

    const { doc } = found;

    res.setHeader("Content-Type", "application/pdf");
    const pdf = new PDFDocument({ size: [300, 450], margin: 12 });
    pdf.pipe(res);

    pdf.fontSize(16).text("EVENT ENTRY PASS", { align: "center" });
    pdf.moveDown();
    pdf.text(`Name: ${doc.name || ""}`);
    pdf.text(`Email: ${doc.email || ""}`);
    pdf.text(`Company: ${doc.company || ""}`);
    pdf.moveDown();
    pdf.text(`Ticket: ${ticketKey}`, { align: "center" });

    pdf.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
