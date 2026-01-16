const { generateBadgePDF } = require("./badgeGenerator");
const { buildTicketEmail } = require("./emailTemplate");
const mailer = require("./mailer");
const roleConfig = require("./emailRoleConfig");

/**
 * Helper to fetch JSON from URL (works in Node.js)
 */
async function safeFetch(url) {
  try {
    let _fetch = typeof fetch !== "undefined" ? fetch : null;
    if (!_fetch) {
      try {
        const nf = require("node-fetch");
        _fetch = nf && nf.default ? nf.default : nf;
      } catch (e) {
        return null;
      }
    }
    
    const res = await _fetch(url, {
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning":  "69420",
      },
    });
    
    if (!res. ok) return null;
    return await res.json().catch(() => null);
  } catch (e) {
    console.warn("[sendTicketEmail] fetch failed:", url, e. message);
    return null;
  }
}

/**
 * Fetch canonical event details from backend
 */
async function fetchEventDetails() {
  const apiBase = process.env.BACKEND_URL || process.env.API_BASE || "";
  
  if (!apiBase || !/^https?:\/\//i.test(apiBase)) {
    console.warn("[sendTicketEmail] BACKEND_URL not set - using fallback event details");
    return null;
  }

  const paths = ["/api/configs/event-details", "/api/event-details"];
  
  for (const path of paths) {
    const url = `${apiBase. replace(/\/$/, "")}${path}?cb=${Date.now()}`;
    try {
      const js = await safeFetch(url);
      if (! js) continue;
      
      const val = js.value !== undefined ? js.value : js;
      if (val && typeof val === "object" && Object.keys(val).length) {
        console.log("[sendTicketEmail] Event details fetched from:", url);
        return {
          name: val.name || val.eventName || val.title || "",
          dates: val.dates || val.date || val.eventDates || "",
          time: val.time || val.startTime || val.eventTime || "",
          venue: val.venue || val.location || val.eventVenue || "",
          tagline: val.tagline || val.subtitle || "",
        };
      }
    } catch (e) {
      console.warn("[sendTicketEmail] Failed to fetch from", url);
      continue;
    }
  }
  
  return null;
}

/**
 * Fetch admin logo URL from backend
 */
async function fetchAdminLogo() {
  const apiBase = process.env.BACKEND_URL || process. env.API_BASE || "";
  
  if (!apiBase || !/^https?:\/\//i.test(apiBase)) {
    return "";
  }

  const paths = ["/api/admin-config", "/api/admin/logo-url"];
  
  for (const path of paths) {
    const url = `${apiBase.replace(/\/$/, "")}${path}?cb=${Date.now()}`;
    try {
      const js = await safeFetch(url);
      if (!js) continue;
      
      if (js.logoUrl) return js.logoUrl;
      if (js.logo_url) return js.logo_url;
      if (js.url) return js.url;
      if (typeof js === "string" && js.trim()) return js.trim();
    } catch (e) {
      continue;
    }
  }
  
  return "";
}

/**
 * Main function:  Send ticket email with badge
 */
module.exports = async function sendTicketEmail({
  entity,
  record,
  frontendBase = "",
  options = {},
}) {
  const doc = record;
  const config = roleConfig[entity];

  if (!config) {
    throw new Error(`Unsupported entity for email: ${entity}`);
  }

  if (! doc?.email) {
    throw new Error("Recipient email missing");
  }

  // ✅ FETCH EVENT DETAILS ONCE (not in email template)
  let eventDetails = null;
  try {
    eventDetails = await fetchEventDetails();
  } catch (e) {
    console.warn("[sendTicketEmail] Could not fetch event details:", e.message);
  }

  // ✅ FETCH ADMIN LOGO ONCE
  let logoUrl = "";
  try {
    logoUrl = await fetchAdminLogo();
  } catch (e) {
    console.warn("[sendTicketEmail] Could not fetch admin logo:", e.message);
  }

  // Handle nested data structure (visitors store form data in doc.data)
  const getField = (field) => {
    if (doc[field] !== undefined) {
      return doc[field];
    }
    return doc.data?.[field];
  };

  // Normalize data for badge generator
  const badgeData = {
    ... doc,
    name: getField("name") ?? doc.name,
    company: getField("company") ?? doc.company,
    ticket_code: doc.ticket_code ??  doc.data?.ticket_code,
    txId: doc.txId ?? doc.data?.txId,
    paid: doc.paid ?? doc.data?.paid,
    amount: doc.amount ?? doc.data?.amount,
    total: doc.total ?? doc.data?.total,
    price: doc.price ?? doc.data?.price,
  };

  // ✅ NO PDF ATTACHMENT - badge only via download button
  let pdfBase64 = null;

  // Build email payload with fetched event details
  const emailPayload = await buildTicketEmail({
    frontendBase:  frontendBase || process.env.FRONTEND_BASE || "",
    entity,
    id:  String(doc._id),
    name: getField("name") ?? doc.name,
    company: getField("company") ?? doc.company,
    ticket_category:  getField("ticket_category") ?? doc.ticket_category,
    logoUrl:  logoUrl || "",
    form:  {
      ...(doc.data ?? doc),
      eventDetails, // ✅ Pass fetched event details
    },
    pdfBase64: null, // ✅ NO attachment
    upgradeUrl: config. allowUpgrade ? undefined : "",
  });

  // Override subject if needed
  if (config.subjectPrefix) {
    emailPayload.subject = `RailTrans Expo — ${config.subjectPrefix}`;
  }

  const result = await mailer.sendMail({
    to: doc. email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
    attachments: emailPayload.attachments, // Will be empty array
  });

  // Return standardized result
  if (result && result.success) {
    return {
      success:  true,
      info: result. info,
      messageId: result.info?.messageId,
      dbRecordId: result.dbRecordId,
    };
  } else {
    return {
      success: false,
      error: result?.error || "Mail send failed",
      dbRecordId: result?.dbRecordId,
    };
  }
};