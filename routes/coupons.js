const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const mongo = require("../utils/mongoClient");

router.use(express.json({ limit: "5mb" }));

async function obtainDb() {
  if (!mongo) return null;
  if (typeof mongo.getDb === "function") return await mongo.getDb();
  if (mongo.db) return mongo.db;
  return null;
}

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

function generateCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// --- List coupons ---
router.get("/", async (req, res) => {
  try {
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });
    const col = db.collection("coupons");
    const status = (req.query.status || "all").toLowerCase();
    const filter = {};
    if (status === "used") filter.used = true;
    if (status === "unused") filter.used = { $ne: true };
    const rows = await col.find(filter).sort({ created_at: -1 }).toArray();
    const out = rows.map(r => ({ ...r, id: String(r._id), _id: undefined }));
    res.json({ success: true, coupons: out });
  } catch (e) {
    res.status(500).json({ success: false, error: "failed to list coupons" });
  }
});

// --- Create coupon ---
router.post("/", async (req, res) => {
  try {
    const { code, discount } = req.body || {};
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });
    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");

    let finalCode = code ? String(code).trim().toUpperCase() : null;

    // Generate unique code if not provided
    if (!finalCode) {
      for (let i = 0; i < 6; i++) {
        const c = generateCode();
        if (!(await col.findOne({ code: c }))) {
          finalCode = c;
          break;
        }
      }
      if (!finalCode) finalCode = generateCode(10);
    }

    if (await col.findOne({ code: finalCode })) {
      return res.status(400).json({ success: false, error: "Coupon code already exists" });
    }

    const pct = Number(discount);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100)
      return res.status(400).json({ success: false, error: "invalid discount (must be 0-100)" });

    const doc = {
      code: finalCode,
      discount: pct,
      used: false,
      used_at: null,
      used_by: null,
      created_at: new Date()
    };

    const r = await col.insertOne(doc);
    await logs.insertOne({ type: "create", code: finalCode, discount: pct, created_at: new Date() }).catch(() => {});
    res.status(201).json({ success: true, coupon: { ...doc, id: String(r.insertedId), _id: undefined } });
  } catch (e) {
    res.status(500).json({ success: false, error: "create failed" });
  }
});

// --- Bulk generate ---
router.post("/generate", async (req, res) => {
  try {
    const { count, discount } = req.body || {};
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });
    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");
    const num = Math.min(500, Math.max(1, Number(count || 10)));
    const pct = Number(discount);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100)
      return res.status(400).json({ success: false, error: "invalid discount" });

    const docs = [];
    for (let i = 0; i < num; i++) {
      let code;
      for (let j = 0; j < 6; j++) {
        code = generateCode();
        if (!(await col.findOne({ code }))) break;
      }
      docs.push({
        code,
        discount: pct,
        used: false,
        used_at: null,
        used_by: null,
        created_at: new Date()
      });
    }
    if (docs.length) {
      await col.insertMany(docs);
      await logs.insertOne({ type: "bulk_generate", count: docs.length, discount: pct, created_at: new Date() }).catch(() => {});
    }
    res.json({ success: true, count: docs.length });
  } catch (e) {
    res.status(500).json({ success: false, error: "generate failed" });
  }
});

// --- Delete coupon ---
router.delete("/:id", async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ success: false, error: "invalid id" });
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });
    const col = db.collection("coupons");
    const r = await col.deleteOne({ _id: oid });
    if (!r.deletedCount) return res.status(404).json({ success: false, error: "coupon not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "delete failed" });
  }
});

// --- Mark used (admin/manual) ---
router.post("/:id/use", async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ success: false, error: "invalid id" });
    const { used_by } = req.body || {};
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });
    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");

    const doc = await col.findOne({ _id: oid });
    if (!doc) return res.status(404).json({ success: false, error: "coupon not found" });
    if (doc.used) return res.status(400).json({ success: false, error: "coupon already used" });

    await col.updateOne(
      { _id: oid },
      { $set: { used: true, used_at: new Date(), used_by: used_by || "admin" } }
    );
    await logs.insertOne({ type: "mark_used", code: doc.code, used_by: used_by || "admin", created_at: new Date() }).catch(() => {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "mark used failed" });
  }
});

// --- Unmark used (admin/manual) ---
router.post("/:id/unuse", async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ success: false, error: "invalid id" });
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });
    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");

    const doc = await col.findOne({ _id: oid });
    if (!doc) return res.status(404).json({ success: false, error: "coupon not found" });

    await col.updateOne({ _id: oid }, { $set: { used: false, used_at: null, used_by: null } });
    await logs.insertOne({ type: "unmark_used", code: doc.code, created_at: new Date() }).catch(() => {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: "unmark failed" });
  }
});

// --- Validate coupon (use ONLY for validation, never consume in frontend) ---
router.post("/validate", async (req, res) => {
  try {
    const { code, price } = req.body || {};
    if (!code) {
      return res.status(400).json({ valid: false, error: "Coupon code is required" });
    }
    const db = await obtainDb();
    if (!db) {
      return res.status(500).json({ valid: false, error: "Database not available" });
    }
    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");
    const normalizedCode = String(code).trim().toUpperCase();

    const existingCoupon = await col.findOne({ code: normalizedCode });
    if (!existingCoupon) {
      return res.json({ valid: false, error: "Coupon code not found" });
    }
    if (existingCoupon.used) {
      return res.json({ valid: false, error: "Coupon has already been used" });
    }
    const discount = Number(existingCoupon.discount || 0);

    // Calculate reduced price
    let reducedPrice = null;
    if (typeof price === "number" && price > 0) {
      reducedPrice = Math.max(0, +(price - price * (discount / 100)).toFixed(2));
    }

    // Just validate, NEVER consume here (done in ticket upgrade/payment flow)
    return res.json({
      valid: true,
      discount,
      reducedPrice,
      originalPrice: price,
      coupon: { id: String(existingCoupon._id), code: existingCoupon.code, used: false }
    });
  } catch (e) {
    res.status(500).json({ valid: false, error: "Validation failed: " + (e.message || "unknown error") });
  }
});

// --- Coupon logs ---
router.get("/logs", async (req, res) => {
  try {
    const db = await obtainDb();
    if (!db) return res.json({ success: true, logs: [] });
    const logs = await db.collection("coupon_logs").find({}).sort({ created_at: -1 }).limit(500).toArray();
    res.json({ success: true, logs });
  } catch (e) {
    res.status(500).json({ success: false, error: "failed to fetch logs" });
  }
});

module.exports = router;