const express = require("express");
const router = express.Router();
const mongo = require("../utils/mongoClient");
const { ObjectId } = require("mongodb");
const mailer = require("../utils/mailer");
const { buildTicketEmail } = require("../utils/emailTemplate");

router.use(express.json({ limit: "6mb" }));

/* ---------------- helpers ---------------- */

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

function generateTicketCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isEmailLike(v) {
  return typeof v === "string" && /\S+@\S+\.\S+/.test(v);
}

function resolveRole(doc = {}) {
  if (doc.ticket_category) return String(doc.ticket_category).toUpperCase();
  if (Number(doc.amount || doc.total || 0) > 0) return "DELEGATE";
  return "VISITOR";
}

/* ---------------- ROUTES ---------------- */

/**
 * GET /api/visitors
 */
router.get("/", async (req, res) => {
  const db = await obtainDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "DB not ready" });
  }

  const rows = await db
    .collection("visitors")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, data: rows });
});

/**
 * POST /api/visitors
 * ❌ DO NOT SEND EMAIL HERE
 */
router.post("/", async (req, res) => {
  const db = await obtainDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "DB not ready" });
  }

  const body = req.body || {};
  const form = body.form || body || {};

  const email = String(form.email || "").trim();
  if (!isEmailLike(email)) {
    return res.status(400).json({ success: false, message: "Valid email required" });
  }

  const ticket_code = form.ticket_code || generateTicketCode();

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
  };

  const r = await db.collection("visitors").insertOne(doc);

  res.json({
    success: true,
    insertedId: r.insertedId,
    ticket_code,
    mail: { skipped: true },
  });
});

/**
 * POST /api/visitors/:id/resend-email
 * ✅ EMAIL + BADGE
 */
router.post("/:id/resend-email", async (req, res) => {
  const db = await obtainDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "DB not ready" });
  }

  let oid;
  try {
    oid = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ success: false, error: "Invalid ID" });
  }

  const coll = db.collection("visitors");
  const doc = await coll.findOne({ _id: oid });
  if (!doc) {
    return res.status(404).json({ success: false, error: "Visitor not found" });
  }

  if (!isEmailLike(doc.email)) {
    return res.status(400).json({ success: false, error: "Invalid email" });
  }

  /* -------- BADGE (LAZY + SAFE) -------- */
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

    if (badge?.pngBase64) {
      badgeDataUri = `data:image/png;base64,${badge.pngBase64}`;
    }
  } catch (err) {
    console.warn("[badge] skipped:", err.message || err);
  }

  /* -------- EMAIL TEMPLATE -------- */
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

  /* -------- SEND EMAIL -------- */
  const sendRes = await mailer.sendMail({
    to: doc.email,
    subject: tpl.subject,
    text: tpl.text,
    html: tpl.html,
    attachments: tpl.attachments || [],
  });

  if (sendRes?.success) {
    await coll.updateOne(
      { _id: oid },
      { $set: { email_sent_at: new Date() }, $unset: { email_failed: "" } }
    );
    return res.json({ success: true });
  }

  await coll.updateOne(
    { _id: oid },
    { $set: { email_failed: true, email_failed_at: new Date() } }
  );

  res.status(500).json({ success: false, error: sendRes?.error || "Mail failed" });
});

/**
 * DELETE /api/visitors/:id
 */
router.delete("/:id", async (req, res) => {
  const db = await obtainDb();
  if (!db) {
    return res.status(500).json({ success: false, error: "DB not ready" });
  }

  const coll = db.collection("visitors");
  const id = req.params.id;

  let result = null;

  if (ObjectId.isValid(id)) {
    result = await coll.deleteOne({ _id: new ObjectId(id) });
  }

  if (!result || result.deletedCount === 0) {
    result = await coll.deleteOne({ ticket_code: id });
  }

  if (!result?.deletedCount) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true });
});

module.exports = router;
