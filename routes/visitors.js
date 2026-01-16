const express = require("express");
const router = express.Router();
const mongo = require("../utils/mongoClient");
const { ObjectId } = require("mongodb");
const sendTicketEmail = require("../utils/sendTicketEmail"); // centralized email + badge sender

router.use(express.json({ limit: "6mb" }));

async function obtainDb() {
  try {
    if (!mongo) return null;
    if (typeof mongo. getDb === "function") return await mongo.getDb();
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
    console.error("[visitors] list error:", err && (err. stack || err));
    return res.status(500).json({ success: false, error: "Failed to list visitors" });
  }
});

/**
 * GET /api/visitors/:id
 *
 * Accept ObjectId or ticket_code
 */
router. get("/:id", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  const id = req.params.id;
  let doc = null;
  const coll = db.collection("visitors");

  const oid = toObjectId(id);
  if (oid) {
    doc = await coll.findOne({ _id: oid }).catch(() => null);
  }

  if (!doc) {
    doc = await coll.findOne({ ticket_code: id }).catch(() => null);
  }

  if (!doc) return res.status(404).json({ success: false, error: "Visitor not found" });

  return res.json(doc);
});

/**
 * POST /api/visitors
 * Create visitor and send email in background (unless added_by_admin is true).
 */
router.post("/", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error:  "DB not ready" });

  try {
    const body = req.body || {};
    const form = body.form || body || {};

    const email = String(form.email || "").trim();
    if (!isEmailLike(email)) {
      return res. status(400).json({ success: false, message: "Valid email required" });
    }

    // Generate unique ticket_code (collision-safe)
    const coll = db.collection("visitors");
    let ticket_code = form.ticket_code;
    if (!ticket_code) {
      do {
        ticket_code = String(Math.floor(100000 + Math.random() * 900000));
      } while (await coll.findOne({ ticket_code }));
    }

    const doc = {
      role: "visitor",
      name: form. name || null,
      email,
      mobile: form.mobile || null,
      ticket_code,

      // 🔥 REQUIRED FOR BADGE
      txId: form.txId || null,
      ticket_price: Number(form.ticket_price || 0),
      ticket_gst: Number(form.ticket_gst || 0),
      ticket_total: Number(form.ticket_total || 0),

      data: form,
      createdAt: new Date(),
      updatedAt: new Date(),
      added_by_admin:  !!body.added_by_admin,
      admin_created_at: body.added_by_admin ? new Date(body.admin_created_at || Date.now()) : undefined,
    };

    const r = await coll.insertOne(doc);
    const insertedId = r.insertedId ? String(r.insertedId) : null;

    // If created by admin, skip email and return immediately
    if (doc.added_by_admin) {
      return res.json({
        success: true,
        insertedId,
        ticket_code,
        mail: { skipped: true },
      });
    }

    // Non-admin:  respond immediately and queue email in background
    res.json({
      success: true,
      insertedId,
      ticket_code,
      mail: { queued: true },
    });

    // Background email send (fire-and-forget)
    (async () => {
      try {
        const savedDoc = await coll.findOne({ _id: r.insertedId });
        if (! savedDoc) {
          console.warn("[visitors] saved but cannot retrieve doc for email");
          return;
        }

        if (!isEmailLike(savedDoc.email)) {
          console. warn("[visitors] saved but no valid email; skipping mail");
          return;
        }

        const result = await sendTicketEmail({
          entity: "visitors",
          record: savedDoc,
          options: { forceSend: false, includeBadge: true },
        });

        if (result && result.success) {
          try {
            await coll.updateOne({ _id: r.insertedId }, { $set: { email_sent_at: new Date() }, $unset: { email_failed: "" } });
            console.log("[visitors] email sent to", savedDoc.email);
          } catch (upErr) {
            console.warn("[visitors] email sent but failed to update DB flags:", upErr && (upErr.message || upErr));
          }
        } else {
          console.error("[visitors] email failed:", result && result.error ?  result.error : result);
          try {
            await coll.updateOne({ _id: r.insertedId }, { $set: { email_failed: true, email_failed_at: new Date() } });
          } catch (upErr) { /* ignore */ }
        }
      } catch (e) {
        console.error("[visitors] background email error:", e && (e.stack || e));
        try {
          if (r && r.insertedId) {
            await coll.updateOne({ _id: r.insertedId }, { $set: { email_failed: true, email_failed_at: new Date() } });
          }
        } catch (upErr) { /* ignore */ }
      }
    })();

    return;
  } catch (err) {
    console.error("[visitors] create error:", err && (err. stack || err));
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
    const fields = { ...(req. body || {}) };
    delete fields._id;
    delete fields.id;

    if (Object.keys(fields).length === 0) return res.status(400).json({ success: false, error: "No fields to update" });

    const update = {};
    for (const [k, v] of Object.entries(fields)) update[k] = v;
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
 *
 * IMPORTANT: this route delegates the email + badge generation to a centralized util
 * `utils/sendTicketEmail.js`. That util handles role-specific templates, attachments,
 * PDF badge generation, retries and returns a standardized result.
 *
 * The handler here updates email_sent_at/email_failed flags based on that result.
 */
router. post("/:id/resend-email", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ success: false, error: "Invalid ID" });

  const coll = db.collection("visitors");
  const doc = await coll.findOne({ _id: oid });
  if (!doc) return res.status(404).json({ success: false, error: "Visitor not found" });

  if (!isEmailLike(doc.email)) return res.status(400).json({ success: false, error:  "Invalid email" });

  try {
    const result = await sendTicketEmail({
      entity:  "visitors",
      record: doc,
    });

    if (result && result.success) {
      await coll.updateOne({ _id: oid }, { $set: { email_sent_at: new Date() }, $unset: { email_failed: "" } });
      return res.json({ success: true });
    }

    // send failed
    await coll.updateOne({ _id: oid }, { $set: { email_failed: true, email_failed_at: new Date() } });
    console.error("[visitors] resend-email failed result:", result);
    return res.status(500).json({ success: false, error:  result && result.error ? result. error : "Failed to send email" });
  } catch (err) {
    console.error("[visitors] resend mail error:", err && (err.stack || err));
    await coll.updateOne({ _id: oid }, { $set: { email_failed: true, email_failed_at: new Date() } }).catch(() => {});
    return res.status(500).json({ success: false, error: "Mail send failed" });
  }
});

/**
 * DELETE /api/visitors/: id
 */
router.delete("/:id", async (req, res) => {
  const db = await obtainDb();
  if (!db) return res.status(500).json({ success: false, error: "DB not ready" });

  const id = req. params.id;
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