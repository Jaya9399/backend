const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const mongo = require("../utils/mongoClient");

// parse JSON bodies
router.use(express.json({ limit: "5mb" }));

/* ---------------- helpers ---------------- */

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

/* ---------------- LIST COUPONS ---------------- */

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
    console.error("GET /coupons", e);
    res.status(500).json({ success: false, error: "failed to list coupons" });
  }
});

/* ---------------- CREATE COUPON ---------------- */

router.post("/", async (req, res) => {
  try {
    const { code, discount } = req.body || {};
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false });

    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");

    let finalCode = code ? String(code).trim().toUpperCase() : null;

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

    const pct = Number(discount);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ success: false, error: "invalid discount" });
    }

    const doc = {
      code: finalCode,
      discount: pct,
      used: false,
      used_at: null,
      used_by: null,
      created_at: new Date()
    };

    const r = await col.insertOne(doc);

    await logs.insertOne({
      type: "create",
      code: finalCode,
      discount: pct,
      created_at: new Date()
    }).catch(() => {});

    res.status(201).json({
      success: true,
      coupon: { ...doc, id: String(r.insertedId) }
    });
  } catch (e) {
    console.error("POST /coupons", e);
    res.status(500).json({ success: false, error: "create failed" });
  }
});

/* ---------------- DELETE COUPON ---------------- */

router.delete("/:id", async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ success: false });

    const db = await obtainDb();
    const col = db.collection("coupons");

    const r = await col.deleteOne({ _id: oid });
    if (!r.deletedCount) return res.status(404).json({ success: false });

    res.json({ success: true });
  } catch (e) {
    console.error("DELETE /coupons/:id", e);
    res.status(500).json({ success: false });
  }
});

/* ---------------- VALIDATE & AUTO-USE COUPON ---------------- */
/**
 * POST /api/coupons/validate
 * Body: { code, price }
 * Coupon is MARKED USED IMMEDIATELY (atomic)
 */

router.post("/validate", async (req, res) => {
  try {
    const { code, price } = req.body || {};
    if (!code) return res.status(400).json({ valid: false, error: "code required" });

    const db = await obtainDb();
    if (!db) return res.status(500).json({ valid: false });

    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");

    const normalizedCode = String(code).trim().toUpperCase();

    // 🔐 ATOMIC: find unused coupon AND mark used
    const result = await col.findOneAndUpdate(
      { code: normalizedCode, used: { $ne: true } },
      {
        $set: {
          used: true,
          used_at: new Date(),
          used_by: "user"
        }
      },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return res.json({
        valid: false,
        error: "coupon already used or invalid"
      });
    }

    const coupon = result.value;
    const discount = Number(coupon.discount || 0);

    let reducedPrice;
    if (typeof price === "number") {
      reducedPrice = Math.max(
        0,
        +(price - price * (discount / 100)).toFixed(2)
      );
    }

    await logs.insertOne({
      type: "use",
      code: coupon.code,
      discount,
      created_at: new Date()
    }).catch(() => {});

    return res.json({
      valid: true,
      discount,
      reducedPrice,
      coupon: {
        id: String(coupon._id),
        code: coupon.code,
        used: true
      }
    });
  } catch (e) {
    console.error("POST /coupons/validate", e);
    res.status(500).json({ valid: false, error: "validation failed" });
  }
});

/* ---------------- COUPON LOGS ---------------- */

router.get("/logs", async (req, res) => {
  try {
    const db = await obtainDb();
    if (!db) return res.json({ success: true, logs: [] });

    const logs = await db
      .collection("coupon_logs")
      .find({})
      .sort({ created_at: -1 })
      .limit(500)
      .toArray();

    res.json({ success: true, logs });
  } catch (e) {
    console.error("GET /coupons/logs", e);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
