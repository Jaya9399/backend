const { ObjectId } = require('mongodb');
const axios = require("axios");
const util = require("util");
const fs = require("fs");
const path = require("path");

const INSTAMOJO_API_KEY = (process.env.INSTAMOJO_API_KEY || "").trim();
const INSTAMOJO_AUTH_TOKEN = (process.env.INSTAMOJO_AUTH_TOKEN || "").trim();
const INSTAMOJO_API_BASE = (process.env.INSTAMOJO_API_BASE || "https://www.instamojo.com").replace(/\/$/, "");
const INSTAMOJO_WEBHOOK_URL = (process.env.INSTAMOJO_WEBHOOK_URL || "").trim();
const APP_ORIGIN = (process.env.APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");

if (!INSTAMOJO_API_KEY || !INSTAMOJO_AUTH_TOKEN) {
  console.warn("Instamojo credentials not set. Set INSTAMOJO_API_KEY and INSTAMOJO_AUTH_TOKEN in env.");
}

function isLocalHost(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    const host = u.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "";
  } catch (e) {
    return true;
  }
}

// Add this function after the imports
async function obtainDb() {
  const mongo = require('../utils/mongoClient');
  if (!mongo) return null;
  if (typeof mongo.getDb === 'function') return await mongo.getDb();
  if (mongo.db) return mongo.db;
  return null;
}

function formatAmount(amount) {
  const n = Number(amount) || 0;
  return n.toFixed(2);
}

function instamojoHeaders() {
  return {
    "X-Api-Key": INSTAMOJO_API_KEY,
    "X-Auth-Token": INSTAMOJO_AUTH_TOKEN,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

// Add this after obtainDb in createOrder
async function ensurePaymentsCollection(db) {
  try {
    const collections = await db.listCollections({ name: 'payments' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('payments');
      console.log('[DB] Created payments collection');
    }
  } catch (err) {
    console.warn('[DB] Could not ensure payments collection:', err.message);
  }
}
exports.createOrder = async (req, res) => {
  try {
    const {
      amount,
      currency = "INR",
      description = "Ticket",
      reference_id,
      callback_url,
      metadata = {},
      visitor_id = null,
    } = req.body || {};

    if (reference_id == null) {
      return res.status(400).json({ success: false, error: "reference_id is required" });
    }

    const amountNum = Number(amount || 0);
    const amountStr = formatAmount(amountNum);
    const redirectUrl = callback_url || `${APP_ORIGIN}/payment-return`;


    // Determine webhook URL: explicit override wins, else build from BACKEND_ORIGIN
    let webhookUrl = INSTAMOJO_WEBHOOK_URL || `${BACKEND_ORIGIN}/api/payment/webhook`;

    // Fix double slash in webhook URL
    if (webhookUrl) {
      webhookUrl = webhookUrl.replace(/([^:]\/)\/+/g, "$1");
    }

    // If webhook resolves to localhost and user did not explicitly set INSTAMOJO_WEBHOOK_URL, do not send it
    const webhookSent = !(isLocalHost(webhookUrl) && !INSTAMOJO_WEBHOOK_URL);

    if (isLocalHost(webhookUrl) && !INSTAMOJO_WEBHOOK_URL) {
      console.warn("[Instamojo] webhook URL resolves to localhost. Will NOT send webhook param to provider.");
      webhookUrl = null;
    }

    console.log("[Instamojo] Webhook URL after cleanup:", webhookUrl || "none");

    // If amount <= 0, we won't call Instamojo; create a local 'created' payment and return a local response
    if (amountNum <= 0 || !INSTAMOJO_API_KEY || !INSTAMOJO_AUTH_TOKEN) {
      // persist payment row locally
      try {
        const db = await obtainDb();
        if (db) {
          const paymentsCol = db.collection('payments');
          await paymentsCol.insertOne({
            visitor_id: visitor_id || null,
            reference_id: reference_id || null,
            provider: "local", // Changed from "instamojo" to "local"
            provider_order_id: null, // Fixed: was using undefined providerRequestId
            amount: amountNum,
            currency: currency,
            status: "created",
            metadata: metadata || {},
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log("[DB] Payment record saved to MongoDB");
        }
      } catch (dbErr) {
        console.warn("[DB] Could not save payment record:", dbErr && dbErr.message);
      }

      return res.json({
        success: true,
        checkoutUrl: null,
        providerOrderId: null,
        hint: amountNum <= 0 ? "zero-amount order - no external checkout needed" : "no provider credentials",
      });
    }
    // Build Instamojo params
    const params = new URLSearchParams();
    params.append("purpose", description || "Ticket");
    params.append("amount", amountStr);

    // ✅ Fix: Properly handle buyer name and email
    let buyerName = "Customer";
    let buyerEmail = "customer@example.com";

    // Extract from metadata
    if (metadata) {
      if (metadata.buyer_name) buyerName = metadata.buyer_name;
      else if (metadata.name) buyerName = metadata.name;
      else if (metadata.customer && metadata.customer.name) buyerName = metadata.customer.name;

      if (metadata.email) buyerEmail = metadata.email;
      else if (metadata.customer && metadata.customer.email) buyerEmail = metadata.customer.email;
    }

    // Ensure email is valid
    if (!buyerEmail || !buyerEmail.includes('@')) {
      buyerEmail = "customer@example.com";
      console.warn("[Instamojo] Invalid email, using fallback:", buyerEmail);
    }

    params.append("buyer_name", buyerName);
    params.append("email", buyerEmail);
    params.append("redirect_url", redirectUrl);

    // Fix double slash in webhook URL
    let cleanWebhookUrl = webhookUrl;
    if (cleanWebhookUrl) {
      cleanWebhookUrl = cleanWebhookUrl.replace(/([^:]\/)\/+/g, "$1");
    }
    if (cleanWebhookUrl) params.append("webhook", cleanWebhookUrl);

    params.append("send_email", "false");
    params.append("allow_repeated_payments", "false");

    // Add metadata with enhanced info
    const enhancedMetadata = {
      ...metadata,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      reference_id: reference_id
    };
    try {
      params.append("metadata", JSON.stringify(enhancedMetadata));
    } catch (e) {
      console.warn("[Instamojo] Failed to stringify metadata:", e);
    }

    // Log what we're sending (for debugging)
    console.log("[Instamojo] Payment request:", {
      purpose: description,
      amount: amountStr,
      buyer_name: buyerName,
      email: buyerEmail,
      redirect_url: redirectUrl,
      webhook: cleanWebhookUrl || "none"
    });

    const url = `${INSTAMOJO_API_BASE}/api/1.1/payment-requests/`;
    const headers = instamojoHeaders();

    // Logging masked sensitive values
    const mask = (s) => (s && s.length > 8 ? `${s.slice(0, 4)}...${s.slice(-4)}` : "****");
    console.log("[Instamojo] createOrder POST", url);
    console.log("[Instamojo] webhook will be sent:", !!webhookUrl, webhookUrl || "(none)");
    console.log("[Instamojo] amount:", amountStr, "reference_id:", reference_id);

    let instRes;
    try {
      instRes = await axios.post(url, params.toString(), { headers, timeout: 20000, validateStatus: () => true });
    } catch (err) {
      console.error("[Instamojo] HTTP request failed:", err && (err.message || err));
      return res.status(502).json({ success: false, error: "Failed to contact Instamojo", details: err.message || String(err) });
    }

    const statusCode = instRes.status;
    const data = instRes.data || {};

    if (statusCode < 200 || statusCode >= 300) {
      console.error("[Instamojo] create payment-request failed:", statusCode);
      console.error("[Instamojo] Error details:", JSON.stringify(data, null, 2));

      // Provide more helpful error message
      let errorMessage = "Instamojo create failed";
      if (data && data.message) {
        if (typeof data.message === 'object') {
          errorMessage = Object.values(data.message).flat().join(', ');
        } else {
          errorMessage = data.message;
        }
      }

      return res.status(502).json({
        success: false,
        error: errorMessage,
        provider_error: { status: statusCode, data },
        hint: webhookSent ? undefined : "Webhook was omitted because BACKEND_ORIGIN resolves to localhost. For local webhook testing set INSTAMOJO_WEBHOOK_URL to your public HTTPS webhook (e.g. ngrok URL)."
      });
    }

    // Extract checkout URL and provider request id
    const pr = data && (data.payment_request || data) || {};
    const checkoutUrl = pr.longurl || (pr.payment_request && pr.payment_request.longurl) || null;
    const providerRequestId = pr.id || (pr.payment_request && pr.payment_request.id) || null;

    // Persist payment row (best-effort) - MongoDB version
    try {
      const db = await obtainDb();
      if (db) {
        const paymentsCol = db.collection('payments');
        await paymentsCol.insertOne({
          visitor_id: visitor_id || null,
          reference_id: reference_id || null,
          provider: "instamojo",
          provider_order_id: providerRequestId || null,
          amount: amountNum,
          currency: currency,
          status: "created",
          metadata: metadata || {},
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log("[DB] Payment record saved to MongoDB");
      }
    } catch (dbErr) {
      console.warn("[DB] Could not save payment record:", dbErr && dbErr.message);
    }

    return res.json({ success: true, checkoutUrl, providerOrderId: providerRequestId, raw: data });
  } catch (err) {
    console.error("createOrder unexpected error:", err && (err.stack || err));
    return res.status(500).json({ success: false, error: "Server error creating order", details: err && err.message });
  }
};

/**
 * GET /api/payment/status?reference_id=...
 */
exports.status = async (req, res) => {
  try {
    const { reference_id } = req.query;
    if (!reference_id) return res.status(400).json({ success: false, error: "reference_id required" });

    try {
      const db = await obtainDb();
      if (!db) return res.json({ success: true, status: "created" });

      const paymentsCol = db.collection('payments');
      const rec = await paymentsCol.findOne({ reference_id: reference_id });

      if (!rec) return res.json({ success: true, status: "created" });
      return res.json({ success: true, status: rec.status || "unknown", record: rec });
    } catch (dbErr) {
      console.error("payment status DB error:", dbErr && dbErr.message);
      return res.status(500).json({ success: false, error: "DB error" });
    }
  } catch (err) {
    console.error("payment status unexpected error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * POST /api/payment/webhook
 * Expects express.raw middleware when mounting route so req.body is Buffer.
 * This handler verifies payment by calling Instamojo API and updates DB.
 */
exports.webhookHandler = async (req, res) => {
  try {
    const rawBuf = req.body;
    const rawString = rawBuf && rawBuf.toString ? rawBuf.toString("utf8") : "";

    // Attempt to parse JSON first, fallback to x-www-form-urlencoded
    let payload = {};
    try {
      payload = JSON.parse(rawString);
    } catch (e) {
      try {
        const p = new URLSearchParams(rawString);
        for (const [k, v] of p.entries()) payload[k] = v;
      } catch (e2) {
        payload = {};
      }
    }

    const payment_id = payload.payment_id || (payload.payment && payload.payment.id) || null;
    const payment_request_id = payload.payment_request_id || (payload.payment_request && payload.payment_request.id) || null;

    // Verify via Instamojo API (best-effort)
    let verified = null;
    try {
      if (payment_id) {
        const url = `${INSTAMOJO_API_BASE}/api/1.1/payments/${encodeURIComponent(payment_id)}/`;
        const check = await axios.get(url, { headers: instamojoHeaders(), timeout: 15000, validateStatus: () => true });
        verified = check.data || null;
      } else if (payment_request_id) {
        const url = `${INSTAMOJO_API_BASE}/api/1.1/payment-requests/${encodeURIComponent(payment_request_id)}/`;
        const check = await axios.get(url, { headers: instamojoHeaders(), timeout: 15000, validateStatus: () => true });
        verified = check.data || null;
      }
    } catch (err) {
      console.warn("Instamojo verification API call failed:", err && (err.response && err.response.data) ? err.response.data : err && err.message);
    }

    let paid = false;
    let providerPaymentId = payment_id || null;
    let providerOrderId = payment_request_id || null;
    let amount = null;
    let currency = null;

    if (verified) {
      if (verified.payment && verified.payment.status) {
        const status = String(verified.payment.status || "").toLowerCase();
        paid = ["credit", "successful", "completed", "paid"].includes(status);
        providerPaymentId = verified.payment.id || providerPaymentId;
        providerOrderId = verified.payment.payment_request || providerOrderId;
        amount = verified.payment.amount || amount;
        currency = verified.payment.currency || currency;
      }
      if (!paid && verified.payment_request && verified.payment_request.status) {
        const st = String(verified.payment_request.status || "").toLowerCase();
        paid = st === "completed" || st === "paid";
        providerOrderId = verified.payment_request.id || providerOrderId;
        amount = verified.payment_request.amount || amount;
        currency = verified.payment_request.currency || currency;
      }
    }

    const newStatus = paid ? "paid" : "failed";

    // Update payments table: match by provider_order_id OR provider_payment_id OR reference_id
    // Update payments collection - MongoDB version
    try {
      const db = await obtainDb();
      if (db) {
        const paymentsCol = db.collection('payments');
        const filter = {
          $or: [
            { provider_order_id: providerOrderId },
            { provider_payment_id: providerPaymentId },
            { reference_id: payload?.reference_id }
          ]
        };

        const update = {
          $set: {
            provider_payment_id: providerPaymentId || providerOrderId,
            status: newStatus,
            webhook_payload: payload || {},
            amount: amount || null,
            currency: currency || null,
            received_at: new Date(),
            updated_at: new Date()
          }
        };

        await paymentsCol.updateOne(filter, update);
      }
    } catch (dbErr) {
      console.error("[DB] webhook update error:", dbErr && dbErr.message);
    }

    // Try to find visitor_id from payments row if available, then update visitors table
    try {
      let visitorIdToUpdate = null;
      if (payload && payload.reference_id) {
        // Keep as string; may be ObjectId OR ticket_code or any reference
        visitorIdToUpdate = String(payload.reference_id);
      } else if (providerOrderId) {
        const db = await obtainDb();
        if (db) {
          const paymentsCol = db.collection('payments');
          const pRec = await paymentsCol.findOne({ provider_order_id: providerOrderId });
          if (pRec && pRec.visitor_id) visitorIdToUpdate = pRec.visitor_id;
        }
      } else if (providerPaymentId) {
        const db = await obtainDb();
        if (db) {
          const paymentsCol = db.collection('payments');
          const pRec = await paymentsCol.findOne({ provider_payment_id: providerPaymentId });
          if (pRec && pRec.visitor_id) visitorIdToUpdate = pRec.visitor_id;
        }
      }

      if (visitorIdToUpdate) {
        try {
          const db = await obtainDb();
          if (db) {
            const visitorsCol = db.collection('visitors');
            const updateData = {
              txId: providerPaymentId || providerOrderId || null,
              payment_provider: "instamojo",
              payment_status: newStatus,
              amount_paid: amount || null,
              payment_meta: payload || {},
              updated_at: new Date()
            };

            if (newStatus === 'paid') {
              updateData.paid_at = new Date();
            }

            // Update by _id if possible, else fallback to ticket_code
            const visitorFilter = ObjectId.isValid(visitorIdToUpdate)
              ? { _id: new ObjectId(visitorIdToUpdate) }
              : { ticket_code: String(visitorIdToUpdate) };

            await visitorsCol.updateOne(visitorFilter, { $set: updateData });
          }
        } catch (vErr) {
          console.warn("[DB] visitor update after webhook failed:", vErr && vErr.message);
        }
      }
    } catch (vErr) {
      console.warn("[DB] visitor update after webhook failed:", vErr && vErr.message);
    }

    // Attempt to finalize entity confirm or upgrade workflows (best-effort)
    // Inspect metadata if available in payload or via provider verification
    try {
      const metaStr = (verified && (verified.payment && verified.payment.metadata)) || (verified && verified.payment_request && verified.payment_request.metadata) || payload.metadata || {};
      let metadata = {};
      if (typeof metaStr === "string") {
        try { metadata = JSON.parse(metaStr); } catch (e) { metadata = {}; }
      } else metadata = metaStr || {};

      if (paid) {
        // If metadata indicates upgrade -> call tickets-upgrade endpoint on backend
        const metaNewCategory = metadata.new_category || metadata.upgrade_to || metadata.newCategory;
        const metaEntityType = metadata.entity_type || metadata.entity || metadata.entityType;
        const metaEntityId = metadata.reference_id || metadata.referenceId || payload.reference_id || null;

        if (metaNewCategory && metaEntityType && metaEntityId) {
          // call internal endpoint to finalize upgrade (non-blocking)
          (async () => {
            try {
              const upgradeUrl = `${BACKEND_ORIGIN}/api/tickets/upgrade`;
              await axios.post(upgradeUrl, {
                entity_type: metaEntityType,
                entity_id: metaEntityId,
                new_category: metaNewCategory,
                amount: 0,
                provider_tx: providerPaymentId || providerOrderId || null,
              }, { timeout: 10000 }).catch(() => { });
            } catch (e) {
              console.warn("webhook -> tickets-upgrade call failed", e && e.message);
            }
          })();
        } else {
          // Generic confirm: try to mark entity confirmed (awardees/speakers etc) using reference_id
          const ref = payload.reference_id || (verified && verified.payment && verified.payment.metadata && verified.payment.metadata.reference_id) || null;
          if (ref) {
            (async () => {
              try {
                // attempt confirm for some known entity routes; this is best-effort / idempotent
                const possibleEntities = ["awardees", "speakers", "visitors", "exhibitors", "partners"];
                for (const ent of possibleEntities) {
                  try {
                    await axios.post(`${BACKEND_ORIGIN}/api/${ent}/${encodeURIComponent(String(ref))}/confirm`, { txId: providerPaymentId || providerOrderId || null }, { timeout: 8000 }).catch(() => { });
                  } catch (e) { /* ignore */ }
                }
              } catch (e) {
                /* ignore */
              }
            })();
          }
        }
      }
    } catch (e) {
      console.warn("post-webhook finalize error:", e && e.message);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("webhook handler unexpected error:", err && (err.stack || err));
    try { return res.status(500).json({ success: false, error: "Webhook handling failed" }); } catch (e) { return; }
  }
};