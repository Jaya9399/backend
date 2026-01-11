const express = require("express");
const router = express.Router();
const mongo = require("../utils/mongoClient");
const { ObjectId } = require("mongodb");
const mailer = require("../utils/mailer");
const { buildTicketEmail } = require("../utils/emailTemplate");

router.use(express.json({ limit: "6mb" }));

async function obtainDb() {
  try {
    if (!mongo) return null;
    if (typeof mongo.getDb === "function") return await mongo.getDb();
    if (mongo.db) return mongo.db;
    return null;
  } catch {
    return null;
  }
}

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

function isEmailLike(v) {
  return typeof v === "string" && /\S+@\S+\.\S+/.test(v);
}

function resolveRole(doc = {}) {
  if (doc.ticket_category) return String(doc.ticket_category).toUpperCase();
  if (Number(doc.amount || doc.total || 0) > 0) return "DELEGATE";
  return "VISITOR";
}

/**
 * GET /api/visitors
 */
router.get("/", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  try {
    const rows = await db.collection("visitors").find({}).sort({ createdAt: -1 }).toArray();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[visitors] list error:", err && (err.stack || err));
    return res.status(500).json({ success: false, error: "Failed to list visitors" });
  }
});

/**
 * GET /api/visitors/:id
 */
router.get("/:id", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  const id = req.params.id;
  // accept either ObjectId or ticket_code as fallback
  let doc = null;
  const coll = db.collection("visitors");

  // Try ObjectId
  const oid = toObjectId(id);
  if (oid) {
    doc = await coll.findOne({ _id: oid }).catch(() => null);
  }

  // fallback: not ObjectId or not found -> try ticket_code
  if (!doc) {
    doc = await coll.findOne({ ticket_code: id }).catch(() => null);
  }

  if (!doc) return res.status(404).json({ success: false, error: "Visitor not found" });

  return res.json(doc);
});

/**
 * POST /api/visitors
 * Create visitor (admin flag optional). Do NOT send email here.
 */
router.post("/", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  try {
    const body = req.body || {};
    const form = body.form || body || {};

    const email = String(form.email || "").trim();
    if (!isEmailLike(email)) {
      return res.status(400).json({ success: false, message: "Valid email required" });
    }

    const ticket_code = form.ticket_code || String(Math.floor(100000 + Math.random() * 900000));

    const doc = {
      role: "visitor",
      name: form.name || null,
      email,
      mobile: form.mobile || null,
      ticket_code,
      data: form,
      createdAt: new Date(),
      updatedAt: new Date(),
      added_by_admin: !!body.added_by_admin,
      admin_created_at: body.added_by_admin ? new Date(body.admin_created_at || Date.now()) : undefined,
    };

    const r = await db.collection("visitors").insertOne(doc);
    return res.json({
      success: true,
      insertedId: r.insertedId ? String(r.insertedId) : null,
      ticket_code,
      mail: { skipped: !!doc.added_by_admin },
    });
  } catch (err) {
    console.error("[visitors] create error:", err && (err.stack || err));
    return res.status(500).json({ success: false, error: "Failed to create visitor" });
  }
});

/**
 * PUT /api/visitors/:id
 * Update visitor fields (admin/front-end edits). Returns updated doc.
 */
router.put("/:id", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  const id = req.params.id;
  const oid = toObjectId(id);
  if (!oid) return res.status(400).json({ success: false, error: "Invalid id" });

  try {
    const fields = { ...(req.body || {}) };
    // don't allow changing _id
    delete fields._id;
    delete fields.id;

    if (Object.keys(fields).length === 0) return res.status(400).json({ success: false, error: "No fields to update" });

    // If data/form nested, allow replacing doc.data
    const update = {};
    for (const [k, v] of Object.entries(fields)) {
      // keep objects as-is (Mongo can store objects); stringify only where necessary
      update[k] = v;
    }
    update.updatedAt = new Date();

    const coll = db.collection("visitors");
    const r = await coll.updateOne({ _id: oid }, { $set: update });
    if (r.matchedCount === 0) return res.status(404).json({ success: false, error: "Visitor not found" });

    const updated = await coll.findOne({ _id: oid });
    return res.json({ success: true, saved: updated });
  } catch (err) {
    console.error("[visitors] update error:", err && (err.stack || err));
    return res.status(500).json({ success: false, error: "Failed to update visitor" });
  }
});

/**
 * POST /api/visitors/:id/resend-email
 * Send email + (optionally) generate badge; similar to your existing handler.
 */
router.post("/:id/resend-email", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  let oid;
  try {
    oid = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ success: false, error: "Invalid ID" });
  }

  const coll = db.collection("visitors");
  const doc = await coll.findOne({ _id: oid });
  if (!doc) return res.status(404).json({ success: false, error: "Visitor not found" });

  if (!isEmailLike(doc.email)) return res.status(400).json({ success: false, error: "Invalid email" });

  let badgeDataUri = "";
  try {
    const { generateBadge } = require("../utils/badgeGenerator");
    const badge = await generateBadge({
      name: doc.name || "Attendee",
      company: doc.data?.company || "",
      ticketCode: doc.ticket_code,
      roleLabel: resolveRole(doc),
      badgeNumber: doc.ticket_code,
    });
    if (badge?.pngBase64) badgeDataUri = `data:image/png;base64,${badge.pngBase64}`;
  } catch (err) {
    console.warn("[badge] skipped:", err && (err.message || err));
  }

  const frontendBase = process.env.FRONTEND_BASE || "";
  const tpl = await buildTicketEmail({
    frontendBase,
    entity: "visitors",
    id: String(doc._id),
    name: doc.name || "Participant",
    company: doc.data?.company || "",
    ticket_category: doc.ticket_category || "",
    badgePreviewUrl: badgeDataUri,
    downloadUrl: `${frontendBase}/ticket-download?entity=visitors&id=${doc._id}`,
    form: doc.data || {},
    ticket_code: doc.ticket_code,
  });

  try {
    const sendRes = await mailer.sendMail({
      to: doc.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      attachments: tpl.attachments || [],
    });

    if (sendRes?.success) {
      await coll.updateOne({ _id: oid }, { $set: { email_sent_at: new Date() }, $unset: { email_failed: "" } });
      return res.json({ success: true });
    } else {
      await coll.updateOne({ _id: oid }, { $set: { email_failed: true, email_failed_at: new Date() } });
      return res.status(500).json({ success: false, error: sendRes?.error || "Mail failed" });
    }
  } catch (err) {
    console.error("[visitors] resend mail error:", err && (err.stack || err));
    await coll.updateOne({ _id: oid }, { $set: { email_failed: true, email_failed_at: new Date() } }).catch(() => {});
    return res.status(500).json({ success: false, error: "Mail send failed" });
  }
});

/**
 * DELETE /api/visitors/:id
 */
router.delete("/:id", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  const id = req.params.id;
  let result = null;

  try {
    if (ObjectId.isValid(id)) result = await db.collection("visitors").deleteOne({ _id: new ObjectId(id) });
    if (!result || result.deletedCount === 0) result = await db.collection("visitors").deleteOne({ ticket_code: id });
    if (!result?.deletedCount) return res.status(404).json({ success: false });
    return res.json({ success: true });
  } catch (err) {
    console.error("[visitors] delete error:", err && (err.stack || err));
    return res.status(500).json({ success: false, error: "Delete failed" });
  }
});

module.exports = router;