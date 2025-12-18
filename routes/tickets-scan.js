const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const mongo = require("../utils/mongoClient");

/* ---------- DB helper ---------- */
async function getDb() {
  if (!mongo) throw new Error("mongoClient not available");
  const maybe = mongo.getDb();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

/* ---------- utilities ---------- */
function tryParseJsonSafe(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
function looksLikeBase64(s) {
  if (typeof s !== "string") return false;
  const s2 = s.replace(/\s+/g, "");
  return /^[A-Za-z0-9+/=]+$/.test(s2) && (s2.length % 4 === 0);
}
function normalizeKey(k) { return typeof k === "string" ? k.trim() : String(k); }
function isDigitsString(s) { return typeof s === "string" && /^\d+$/.test(s.trim()); }

/* candidate field names commonly used for ticket id */
const CANDIDATE_FIELDS = [
  "ticket_code","ticketCode","ticket_id","ticketId","ticket","ticketNo","ticketno","ticketid","code","c","id","tk","t"
];

/* ---------- extractor ---------- */
/**
 * Recursively search an object (stack-based) for a ticket-like primitive value.
 * Returns the first plausible primitive found (string or number) or null.
 * Prefers known field names.
 */
function extractTicketIdFromObject(obj) {
  if (!obj || typeof obj !== "object") return null;

  // prefer explicit keys first
  for (const k of CANDIDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k];
      if (v !== undefined && v !== null) return String(v);
    }
    const snake = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(obj, snake)) {
      const v = obj[snake];
      if (v !== undefined && v !== null) return String(v);
    }
  }

  // stack traversal to avoid deep recursion
  const stack = [obj];
  while (stack.length) {
    const node = stack.pop();
    if (node === null || node === undefined) continue;

    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      const s = String(node).trim();
      if (s) return s;
      // try to parse embedded json/base64
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
      for (let i = 0; i < node.length; i++) {
        const it = node[i];
        if (it !== null && it !== undefined) stack.push(it);
      }
      continue;
    }

    if (typeof node === "object") {
      for (const key of Object.keys(node)) {
        const v = node[key];
        if (v === null || v === undefined) continue;
        // prefer candidate keys early
        if (CANDIDATE_FIELDS.includes(key) || CANDIDATE_FIELDS.includes(key.replace(/([A-Z])/g, "_$1").toLowerCase())) {
          if (v !== null && v !== undefined) return String(v);
        }
        stack.push(v);
      }
    }
  }

  return null;
}

/**
 * Normalizes incoming payload to a ticketKey string or null.
 * Accepts numbers, plain strings with digits, stringified JSON, base64 JSON, nested objects.
 */
function extractTicketId(input) {
  if (input === undefined || input === null) return null;
  if (typeof input === "number") return String(input);
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;
    // plain digit substring (prefer longest match 3-12 digits)
    const m = s.match(/\d{3,12}/g);
    if (m && m.length) return m[0];
    // try parse JSON
    const parsed = tryParseJsonSafe(s);
    if (parsed && typeof parsed === "object") {
      const found = extractTicketIdFromObject(parsed);
      if (found) return found;
    }
    // base64 decode attempt
    if (looksLikeBase64(s)) {
      try {
        const dec = Buffer.from(s, "base64").toString("utf8");
        const p2 = tryParseJsonSafe(dec);
        if (p2 && typeof p2 === "object") {
          const found = extractTicketIdFromObject(p2);
          if (found) return found;
        }
        const m2 = dec.match(/\d{3,12}/);
        if (m2) return m2[0];
      } catch (e) {}
    }
    return null;
  }
  if (typeof input === "object") {
    // look for candidate fields or nested values
    const found = extractTicketIdFromObject(input);
    if (found) return found;
    return null;
  }
  return null;
}

/* ---------- database lookup ---------- */
/**
 * findTicket(ticketKey)
 * - tries fast exact lookups (ticket_code and candidate fields)
 * - tries numeric match if key is digits
 * - falls back to scanning a limited set of documents and deep-inspecting them
 */
async function findTicket(ticketKey) {
  if (!ticketKey) return null;
  const db = await getDb();
  const keyStr = String(ticketKey).trim();
  const isNum = /^\d+$/.test(keyStr);
  const keyNum = isNum ? Number(keyStr) : null;

  const collections = ["visitors","exhibitors","partners","speakers","awardees"];
  const SCAN_LIMIT = Number(process.env.TICKET_SCAN_SCAN_LIMIT || 2000);

  for (const collName of collections) {
    const col = db.collection(collName);

    // 1) Fast exact match on ticket_code (string)
    try {
      const exact = await col.findOne({ ticket_code: keyStr });
      if (exact) {
        if (process.env.DEBUG_TICKETS === "true") console.log(`[tickets] exact ticket_code match in ${collName}`);
        return { doc: exact, collection: collName };
      }
    } catch (e) { /* ignore */ }

    // 1b) If numeric, try exact numeric match on ticket_code
    if (keyNum !== null) {
      try {
        const exactNum = await col.findOne({ ticket_code: keyNum });
        if (exactNum) {
          if (process.env.DEBUG_TICKETS === "true") console.log(`[tickets] exact numeric ticket_code match in ${collName}`);
          return { doc: exactNum, collection: collName };
        }
      } catch (e) {}
    }

    // 2) Candidate fields exact (string and numeric)
    try {
      const or = [];
      for (const f of CANDIDATE_FIELDS) {
        const o1 = {}; o1[f] = keyStr; or.push(o1);
        if (keyNum !== null) { const o2 = {}; o2[f] = keyNum; or.push(o2); }
        // anchored case-insensitive regex as fallback
        const r = {}; r[f] = { $regex: new RegExp(`^${keyStr.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`, 'i') }; or.push(r);
      }
      if (or.length) {
        const row = await col.findOne({ $or: or });
        if (row) {
          if (process.env.DEBUG_TICKETS === "true") console.log(`[tickets] candidate-field match in ${collName}`);
          return { doc: row, collection: collName };
        }
      }
    } catch (e) { /* ignore */ }

    // 3) Controlled JS scan fallback: inspect docs that have candidate fields or _rawForm
    try {
      const existsClauses = CANDIDATE_FIELDS.map(f => ({ [f]: { $exists: true } }));
      existsClauses.push({ _rawForm: { $exists: true } });
      const query = { $or: existsClauses };
      const cursor = col.find(query).limit(SCAN_LIMIT);
      if (process.env.DEBUG_TICKETS === "true") console.log(`[tickets] scanning up to ${SCAN_LIMIT} docs in ${collName}`);
      while (await cursor.hasNext()) {
        const doc = await cursor.next();

        // quick field checks
        for (const f of CANDIDATE_FIELDS) {
          if (!Object.prototype.hasOwnProperty.call(doc, f)) continue;
          const v = doc[f];
          if (v === undefined || v === null) continue;
          if (keyNum !== null && typeof v === "number" && v === keyNum) return { doc, collection: collName };
          if (String(v).trim() === keyStr) return { doc, collection: collName };
          if (String(v).trim().toLowerCase() === keyStr.toLowerCase()) return { doc, collection: collName };
        }

        // deep inspection of doc (including _rawForm)
        const found = extractTicketIdFromObject(doc);
        if (found && String(found).trim() === keyStr) return { doc, collection: collName };
        if (found && String(found).trim() === String(keyNum)) return { doc, collection: collName };

        // inspect _rawForm specially
        const raw = doc._rawForm;
        if (raw) {
          if (typeof raw === 'string') {
            const p = tryParseJsonSafe(raw);
            if (p) {
              const f = extractTicketIdFromObject(p);
              if (f && String(f).trim() === keyStr) return { doc, collection: collName };
              if (f && String(f).trim() === String(keyNum)) return { doc, collection: collName };
            } else if (looksLikeBase64(raw)) {
              try {
                const dec = Buffer.from(raw, 'base64').toString('utf8');
                const p2 = tryParseJsonSafe(dec);
                if (p2) {
                  const f2 = extractTicketIdFromObject(p2);
                  if (f2 && String(f2).trim() === keyStr) return { doc, collection: collName };
                }
                const m = dec.match(/\d{3,12}/);
                if (m && m[0] === keyStr) return { doc, collection: collName };
              } catch (e) {}
            } else if (raw.toString().indexOf && raw.toString().indexOf(keyStr) !== -1) {
              return { doc, collection: collName };
            }
          } else if (typeof raw === 'object') {
            const f3 = extractTicketIdFromObject(raw);
            if (f3 && String(f3).trim() === keyStr) return { doc, collection: collName };
          }
        }
      }
    } catch (e) {
      if (process.env.DEBUG_TICKETS === "true") console.warn("[tickets] scan fallback error", e && (e.stack || e));
    }
  }

  return null;
}

/* ---------- routes ---------- */
router.post("/validate", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const incoming = req.body.ticketId !== undefined ? req.body.ticketId : req.body.raw;
    const ticketKey = extractTicketId(incoming);
    if (!ticketKey) return res.status(400).json({ success: false, error: "Could not extract ticket id from payload" });

    if (process.env.DEBUG_TICKETS === "true") console.log("[tickets.validate] extracted ticketKey:", ticketKey);

    const found = await findTicket(ticketKey);
    if (!found) return res.status(404).json({ success: false, error: "Ticket not found" });

    const { doc, collection } = found;

    const ticket = {
      ticket_code: doc.ticket_code || String(ticketKey).trim(),
      entity_type: collection,
      entity_id: doc._id,
      name: doc.name || doc.full_name || doc.n || null,
      email: doc.email || doc.e || null,
      company: doc.company || doc.org || doc.organization || null,
      category: doc.category || doc.ticket_category || null,
      raw_row: doc
    };

    return res.json({ success: true, ticket });
  } catch (err) {
    console.error("tickets/validate error:", err && (err.stack || err));
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/scan", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const incoming = req.body.ticketId !== undefined ? req.body.ticketId : req.body.raw;
    const ticketKey = extractTicketId(incoming);
    if (!ticketKey) return res.status(400).json({ success: false, error: "Could not extract ticket id from payload" });

    if (process.env.DEBUG_TICKETS === "true") console.log("[tickets.scan] ticketKey:", ticketKey);

    const found = await findTicket(ticketKey);
    if (!found) return res.status(404).json({ success: false, error: "Ticket not found" });

    const { doc, collection } = found;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=ticket-${ticketKey}.pdf`);

    const pdf = new PDFDocument({ size: [300, 450], margin: 12 });
    pdf.pipe(res);
    pdf.fontSize(16).text("EVENT ENTRY PASS", { align: "center" });
    pdf.moveDown(2);
    pdf.fontSize(12).text(`Name: ${doc.name || doc.full_name || ""}`);
    pdf.text(`Email: ${doc.email || ""}`);
    pdf.text(`Company: ${doc.company || doc.org || ""}`);
    pdf.moveDown();
    pdf.fontSize(14).text(`Ticket: ${ticketKey}`, { align: "center" });
    pdf.end();
  } catch (err) {
    console.error("tickets/scan error:", err && (err.stack || err));
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;