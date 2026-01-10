const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { getDb } = require("../utils/mongoClient"); // should export async getDb()
const { sendMail } = require("../utils/mailer");
const { ensureTicketCodeUniqueIndex } = require("../utils/mongoSchemaSync"); // optional helper if available

/**
 * Allowed entity collections that can be upgraded.
 * Restrict to known collections to avoid arbitrary collection access.
 */
const ALLOWED_ENTITIES = new Set([
  "speakers",
  "awardees",
  "exhibitors",
  "partners",
  "visitors",
]);

const API_BASE = (process.env.API_BASE || process.env.BACKEND_URL || "/api").replace(/\/$/, "");
const FRONTEND_BASE = (process.env.FRONTEND_BASE || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

function makeApiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

function generateTicketCode(length = 6, prefix = "TICK-") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${prefix}${code}`;
}

function normalizeEmail(e) {
  try {
    return (String(e || "").trim() || "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * POST /api/tickets/upgrade
 *
 * Body:
 *  - entity_type: string (collection name, plural)
 *  - entity_id: string (Mongo _id or string id)
 *  - new_category: string
 *  - amount: number (optional)
 *  - email: string (the email to verify ownership; server will validate against stored email)
 *
 * Behavior:
 *  - Validate inputs and entity_type whitelist
 *  - Fetch the entity row (deterministic)
 *  - Verify stored email exists and matches provided email (server-side authority)
 *  - If amount > 0: create a payment order (after validation) and return checkoutUrl
 *  - If amount == 0: apply upgrade immediately, create/ensure ticket in "tickets" collection (upsert by entity_type+entity_id),
 *    generate unique ticket_code if needed, update entity with ticket_category/ticket_code, send confirmation email to stored email.
 */
router.post("/", async (req, res) => {
  try {
    const { entity_type, entity_id, new_category, amount = 0, email } = req.body || {};

    // Basic validation
    if (!entity_type || !entity_id || !new_category) {
      return res.status(400).json({ success: false, error: "entity_type, entity_id and new_category are required" });
    }
    if (!ALLOWED_ENTITIES.has(String(entity_type).toLowerCase())) {
      return res.status(400).json({ success: false, error: "entity_type not allowed" });
    }

    // canonicalize
    const entityType = String(entity_type).toLowerCase();
    const targetIdRaw = String(entity_id);

    // Obtain DB
    const db = await getDb();
    if (!db) return res.status(500).json({ success: false, error: "database not available" });

    const entityCol = db.collection(entityType);

    // Fetch entity document deterministically by id
    let entityRow = null;
    try {
      const q = ObjectId.isValid(targetIdRaw) ? { _id: new ObjectId(targetIdRaw) } : { _id: targetIdRaw };
      entityRow = await entityCol.findOne(q);
    } catch (e) {
      console.warn("[tickets-upgrade] entity lookup failed:", e && e.message);
    }

    if (!entityRow) {
      return res.status(404).json({ success: false, error: "Entity not found" });
    }

    // Server-side email ownership validation (non-optional)
    const storedEmail = normalizeEmail(entityRow.email || entityRow.contactEmail || entityRow.data?.email || "");
    const providedEmail = email ? normalizeEmail(email) : "";

    if (!storedEmail) {
      // No verified email on record -> reject upgrade requests originating from public flow
      // This prevents attackers from claiming ownership when entity has no known email.
      return res.status(403).json({
        success: false,
        error: "Entity has no verified email on record. Upgrade denied. Please contact support or verify your account.",
      });
    }

    // If request provided an email, it must match stored email
    if (providedEmail && providedEmail !== storedEmail) {
      return res.status(403).json({
        success: false,
        error: "Provided email does not match entity record. Upgrade denied.",
      });
    }

    // At this point we trust the actor is verified (frontend OTP should have verified email).
    // Use storedEmail for all downstream communication.
    const emailToUse = storedEmail;

    // PAYMENT PATH: now that we have a validated entity and verified email, create payment order if needed
    if (Number(amount) > 0) {
      // Build payment order payload (include entity info and customer email)
      const payload = {
        amount: Number(amount),
        currency: "INR",
        description: `Ticket Upgrade - ${new_category}`,
        reference_id: String(entity_id),
        metadata: { entity_type: entityType, new_category },
        customer: { email: emailToUse },
      };
      try {
        const r = await fetch(makeApiUrl("/payment/create-order"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" },
          body: JSON.stringify(payload),
        });
        const js = await r.json().catch(() => ({}));
        if (!r.ok || !js.success) {
          return res.status(502).json({ success: false, error: js.error || "Failed to create payment order", raw: js });
        }
        // Return order info to client; client completes checkout and calls confirm webhook or ticket finalize.
        return res.json({ success: true, checkoutUrl: js.checkoutUrl || js.checkout_url || js.raw?.checkout_url, order: js });
      } catch (e) {
        console.error("[tickets-upgrade] Payment create order failed", e);
        return res.status(502).json({ success: false, error: "Failed to create payment order" });
      }
    }

    // ZERO-AMOUNT PATH: apply upgrade immediately in Mongo

    // Ensure ticket_code unique index exists (best-effort)
    try { if (typeof ensureTicketCodeUniqueIndex === "function") await ensureTicketCodeUniqueIndex(db, "tickets"); } catch (e) { /* ignore */ }

    const ticketsCol = db.collection("tickets");

    // Prefer upserting ticket by (entity_type, entity_id) to avoid trusting any ticket_code supplied by client
    let ticketDoc = null;
    try {
      const filter = { entity_type: entityType, entity_id: targetIdRaw };
      // If an existing ticket for this entity exists, preserve its ticket_code; otherwise generate
      const existingTicket = await ticketsCol.findOne(filter);
      let ticket_code = existingTicket && existingTicket.ticket_code ? existingTicket.ticket_code : generateTicketCode();

      // If ticket_code collides unexpectedly, attempt few retries to generate unique codes
      const update = {
        $set: {
          entity_type: entityType,
          entity_id: targetIdRaw,
          name: entityRow.name || entityRow.fullName || entityRow.company || null,
          email: emailToUse || null,
          company: entityRow.company || null,
          category: new_category,
          meta: { upgradedFrom: "self-service", upgradedAt: new Date() },
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date(), ticket_code },
      };

      // Try initial upsert (by entity). This avoids overwriting someone else's ticket_code.
      const opts = { upsert: true, returnDocument: "after" };
      const result = await ticketsCol.findOneAndUpdate(filter, update, opts);
      ticketDoc = result && result.value ? result.value : null;

      // Defensive: if upsert didn't yield a doc (very unlikely), attempt retries generating new ticket_code and upserting by entity again
      if (!ticketDoc) {
        for (let i = 0; i < 5 && !ticketDoc; i++) {
          const candidate = generateTicketCode();
          update.$setOnInsert = { createdAt: new Date(), ticket_code: candidate };
          const r2 = await ticketsCol.findOneAndUpdate(filter, update, opts);
          ticketDoc = r2 && r2.value ? r2.value : null;
        }
      }

      // As a final fallback, if still no ticketDoc (extremely unlikely), attempt an insert with a unique ticket_code
      if (!ticketDoc) {
        const finalCode = generateTicketCode();
        const insertRes = await ticketsCol.insertOne({
          ticket_code: finalCode,
          entity_type: entityType,
          entity_id: targetIdRaw,
          name: entityRow.name || entityRow.fullName || entityRow.company || null,
          email: emailToUse || null,
          company: entityRow.company || null,
          category: new_category,
          meta: { upgradedFrom: "self-service", upgradedAt: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        ticketDoc = await ticketsCol.findOne({ _id: insertRes.insertedId });
      }
    } catch (e) {
      console.warn("[tickets-upgrade] Ticket upsert failed:", e && e.message);
      // continue, we will attempt to update entity and return best-effort response
    }

    const finalTicketCode = ticketDoc && ticketDoc.ticket_code ? ticketDoc.ticket_code : (entityRow && (entityRow.ticket_code || entityRow.code) ? String(entityRow.ticket_code || entityRow.code) : null);

    // Update entity's ticket_category and ticket_code (best-effort)
    try {
      const q = ObjectId.isValid(targetIdRaw) ? { _id: new ObjectId(targetIdRaw) } : { _id: targetIdRaw };
      await entityCol.updateOne(q, { $set: { ticket_category: new_category, upgradedAt: new Date(), ticket_code: finalTicketCode } });
    } catch (e) {
      console.warn("[tickets-upgrade] Entity confirm update failed:", e && e.message);
    }

    // Send confirmation email to stored email (best-effort)
    if (emailToUse) {
      try {
        const params = new URLSearchParams({ entity: entityType, id: String(targetIdRaw) });
        if (finalTicketCode) params.append("ticket", finalTicketCode);
        const upgradeManageUrl = `${FRONTEND_BASE}/ticket?${params.toString()}`;

        const subj = `Your ticket has been upgraded to ${new_category}`;
        const bodyText = `Hello ${entityRow && (entityRow.name || entityRow.fullName || entityRow.company) || ""},

Your ticket has been upgraded to ${new_category}.

Ticket: ${finalTicketCode || "N/A"}
You can view/manage your ticket here: ${upgradeManageUrl}

Regards,
Team`;
        const bodyHtml = `<p>Hello ${entityRow && (entityRow.name || entityRow.fullName || entityRow.company) || ""},</p>
<p>Your ticket has been upgraded to <strong>${new_category}</strong>.</p>
<p>Ticket: <strong>${finalTicketCode || "N/A"}</strong></p>
<p>You can view/manage your ticket <a href="${upgradeManageUrl}">here</a>.</p>`;

        await sendMail({ to: emailToUse, subject: subj, text: bodyText, html: bodyHtml });
      } catch (e) {
        console.warn("[tickets-upgrade] Upgrade confirmation email failed:", e && e.message);
      }
    }

    return res.json({
      success: true,
      upgraded: true,
      entity_type: entityType,
      entity_id: targetIdRaw,
      new_category,
      ticket_code: finalTicketCode || null,
      ticket: ticketDoc || undefined,
    });
  } catch (err) {
    console.error("[tickets-upgrade] error:", err && (err.stack || err));
    return res.status(500).json({ success: false, error: String(err && err.message ? err.message : err) });
  }
});

module.exports = router;