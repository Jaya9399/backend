const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const mongo = require("../utils/mongoClient");

console.log("🔥 coupons.js LOADING.. .");

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
    const out = rows.map(r => ({ ... r, id: String(r._id), _id: undefined }));

    res.json({ success: true, coupons: out });
  } catch (e) {
    console.error("[coupons] GET error:", e);
    res.status(500).json({ success: false, error: "failed to list coupons" });
  }
});

/* ---------------- CREATE COUPON ---------------- */

router.post("/", async (req, res) => {
  try {
    const { code, discount } = req.body || {};
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });

    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");

    let finalCode = code ?  String(code).trim().toUpperCase() : null;

    // Generate unique code if not provided
    if (! finalCode) {
      for (let i = 0; i < 6; i++) {
        const c = generateCode();
        if (!(await col.findOne({ code: c }))) {
          finalCode = c;
          break;
        }
      }
      if (!finalCode) finalCode = generateCode(10);
    }

    // Check if code already exists
    const existing = await col.findOne({ code: finalCode });
    if (existing) {
      return res.status(400).json({ success: false, error: "Coupon code already exists" });
    }

    const pct = Number(discount);
    if (! Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ success: false, error: "invalid discount (must be 0-100)" });
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
      code:  finalCode,
      discount:  pct,
      created_at: new Date()
    }).catch(() => {});

    console.log("[coupons] Created:", finalCode);

    res.status(201).json({
      success: true,
      coupon: { ... doc, id: String(r. insertedId), _id: undefined }
    });
  } catch (e) {
    console.error("[coupons] POST error:", e);
    res.status(500).json({ success: false, error: "create failed" });
  }
});

/* ---------------- BULK GENERATE ---------------- */

router.post("/generate", async (req, res) => {
  try {
    const { count, discount } = req.body || {};
    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });

    const col = db.collection("coupons");
    const logs = db. collection("coupon_logs");

    const num = Math.min(500, Math.max(1, Number(count || 10)));
    const pct = Number(discount);

    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ success: false, error: "invalid discount" });
    }

    const docs = [];
    for (let i = 0; i < num; i++) {
      let code;
      for (let j = 0; j < 6; j++) {
        code = generateCode();
        if (!(await col.findOne({ code }))) break;
      }
      docs.push({
        code,
        discount:  pct,
        used: false,
        used_at: null,
        used_by: null,
        created_at: new Date()
      });
    }

    if (docs.length) {
      await col.insertMany(docs);
      await logs.insertOne({
        type: "bulk_generate",
        count: docs.length,
        discount: pct,
        created_at:  new Date()
      }).catch(() => {});
    }

    console.log("[coupons] Generated:", docs.length);

    res.json({ success: true, count: docs.length });
  } catch (e) {
    console.error("[coupons] generate error:", e);
    res.status(500).json({ success: false, error: "generate failed" });
  }
});

/* ---------------- DELETE COUPON ---------------- */

router.delete("/:id", async (req, res) => {
  try {
    const oid = toObjectId(req. params.id);
    if (!oid) return res.status(400).json({ success: false, error: "invalid id" });

    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });

    const col = db.collection("coupons");

    const r = await col.deleteOne({ _id: oid });
    if (! r.deletedCount) return res.status(404).json({ success: false, error: "coupon not found" });

    console.log("[coupons] Deleted:", req.params.id);

    res.json({ success: true });
  } catch (e) {
    console.error("[coupons] DELETE error:", e);
    res.status(500).json({ success: false, error: "delete failed" });
  }
});

/* ---------------- MARK USED ---------------- */

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

    if (doc.used) {
      return res.status(400).json({ success: false, error: "coupon already used" });
    }

    const r = await col.updateOne(
      { _id:  oid },
      {
        $set: {
          used: true,
          used_at: new Date(),
          used_by: used_by || "admin"
        }
      }
    );

    await logs.insertOne({
      type: "mark_used",
      code: doc.code,
      used_by: used_by || "admin",
      created_at: new Date()
    }).catch(() => {});

    console.log("[coupons] Marked used:", doc.code);

    res.json({ success: true });
  } catch (e) {
    console.error("[coupons] mark used error:", e);
    res.status(500).json({ success: false, error: "mark used failed" });
  }
});

/* ---------------- UNMARK USED ---------------- */

router.post("/:id/unuse", async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ success: false, error: "invalid id" });

    const db = await obtainDb();
    if (!db) return res.status(500).json({ success: false, error: "db not available" });

    const col = db. collection("coupons");
    const logs = db.collection("coupon_logs");

    const doc = await col.findOne({ _id: oid });
    if (!doc) return res.status(404).json({ success: false, error: "coupon not found" });

    await col.updateOne(
      { _id: oid },
      {
        $set: {
          used: false,
          used_at: null,
          used_by: null
        }
      }
    );

    await logs.insertOne({
      type: "unmark_used",
      code: doc.code,
      created_at: new Date()
    }).catch(() => {});

    console.log("[coupons] Unmarked:", doc.code);

    res.json({ success: true });
  } catch (e) {
    console.error("[coupons] unmark error:", e);
    res.status(500).json({ success: false, error: "unmark failed" });
  }
});

/* ---------------- VALIDATE & APPLY COUPON ---------------- */

router.post("/validate", async (req, res) => {
  try {
    const { code, price, markUsed } = req.body || {};

    console.log("[coupons/validate] Request:", { code, price, markUsed });

    if (!code) {
      return res.status(400).json({
        valid: false,
        error: "Coupon code is required"
      });
    }

    const db = await obtainDb();
    if (!db) {
      return res.status(500).json({
        valid: false,
        error: "Database not available"
      });
    }

    const col = db.collection("coupons");
    const logs = db.collection("coupon_logs");

    const normalizedCode = String(code).trim().toUpperCase();

    console.log("[coupons/validate] Looking for coupon:", normalizedCode);

    // Find the coupon first
    const existingCoupon = await col.findOne({ code: normalizedCode });

    if (!existingCoupon) {
      console.log("[coupons/validate] Coupon not found");
      return res.json({
        valid: false,
        error: "Coupon code not found"
      });
    }

    if (existingCoupon.used) {
      console.log("[coupons/validate] Coupon already used");
      return res.json({
        valid: false,
        error: "Coupon has already been used"
      });
    }

    const discount = Number(existingCoupon.discount || 0);

    // Calculate reduced price if price provided
    let reducedPrice = null;
    if (typeof price === "number" && price > 0) {
      reducedPrice = Math.max(0, +(price - price * (discount / 100)).toFixed(2));
    }

    // If markUsed is true, mark it as used atomically
    if (markUsed === true) {
      console.log("[coupons/validate] Marking coupon as used");

      const result = await col.findOneAndUpdate(
        {
          code: normalizedCode,
          used: { $ne: true }
        },
        {
          $set:  {
            used: true,
            used_at: new Date(),
            used_by: "user"
          }
        },
        { returnDocument: "after" }
      );

      if (!result.value) {
        console.log("[coupons/validate] Failed to mark as used (race condition)");
        return res.json({
          valid: false,
          error: "Coupon was just used by someone else"
        });
      }

      // Log the usage
      await logs.insertOne({
        type: "use",
        code: normalizedCode,
        discount,
        originalPrice: price,
        reducedPrice,
        created_at: new Date()
      }).catch((e) => console.error("[coupons/validate] Log error:", e));

      console.log("[coupons/validate] ✅ Coupon applied successfully");

      return res.json({
        valid: true,
        discount,
        reducedPrice,
        originalPrice: price,
        coupon: {
          id: String(result.value._id),
          code: result.value. code,
          used: true
        }
      });
    }

    // Just validate (don't mark as used)
    console.log("[coupons/validate] ✅ Coupon is valid (not marking as used)");

    return res.json({
      valid: true,
      discount,
      reducedPrice,
      originalPrice:  price,
      coupon: {
        id: String(existingCoupon._id),
        code: existingCoupon. code,
        used: false
      }
    });
  } catch (e) {
    console.error("[coupons/validate] Error:", e. stack || e);
    res.status(500).json({
      valid: false,
      error: "Validation failed:  " + (e.message || "unknown error")
    });
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
    console.error("[coupons] logs error:", e);
    res.status(500).json({ success: false, error: "failed to fetch logs" });
  }
});

console.log("✅ coupons.js LOADED");

module.exports = router;