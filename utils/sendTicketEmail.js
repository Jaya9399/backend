const { buildTicketEmail } = require("./emailTemplate");
const mailer = require("./mailer");
const roleConfig = require("./emailRoleConfig");

// Safe import for badgeGenerator (not used for attachment, but keep for compatibility)
let generateBadgePDF;
try {
  const badgeGen = require("./badgeGenerator");
  generateBadgePDF = badgeGen.generateBadgePDF || badgeGen;
} catch (e) {
  generateBadgePDF = null;
}

/**
 * Helper to fetch JSON from URL (works in Node.js)
 */
async function safeFetch(url) {
  try {
    let _fetch = typeof fetch !== "undefined" ? fetch : null;
    if (! _fetch) {
      try {
        const nf = require("node-fetch");
        _fetch = nf && nf.default ? nf. default : nf;
      } catch (e) {
        console.warn("[sendTicketEmail] node-fetch not available");
        return null;
      }
    }
    
    console.log("[sendTicketEmail] Fetching:", url);
    
    const res = await _fetch(url, {
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning":  "69420",
      },
      timeout: 5000,
    });
    
    if (!res.ok) {
      console.warn("[sendTicketEmail] Fetch failed:", res.status, res. statusText);
      return null;
    }
    
    const data = await res.json();
    console.log("[sendTicketEmail] ✅ Fetch successful");
    return data;
  } catch (e) {
    console.warn("[sendTicketEmail] Fetch error:", e.message);
    return null;
  }
}

/**
 * Fetch canonical event details from backend
 */
async function fetchEventDetails() {
  const apiBase = process.env.BACKEND_URL || process.env.API_BASE || "";
  
  if (!apiBase) {
    console.warn("[sendTicketEmail] ⚠️ BACKEND_URL not set in . env");
    return null;
  }

  if (!/^https?:\/\//i.test(apiBase)) {
    console.warn("[sendTicketEmail] ⚠️ BACKEND_URL must be absolute (http://...):", apiBase);
    return null;
  }

  const paths = ["/api/configs/event-details", "/api/event-details"];
  
  for (const path of paths) {
    const url = `${apiBase. replace(/\/$/, "")}${path}?cb=${Date.now()}`;
    const js = await safeFetch(url);
    
    if (! js) continue;
    
    const val = js.value !== undefined ? js.value : js;
    if (val && typeof val === "object" && Object.keys(val).length) {
      console.log("[sendTicketEmail] ✅ Event details:", val. name);
      return {
        name: val.name || val.eventName || val.title || "",
        dates: val.dates || val.date || val.eventDates || "",
        time: val.time || val.startTime || val.eventTime || "",
        venue: val.venue || val.location || val.eventVenue || "",
        tagline: val.tagline || val.subtitle || "",
      };
    }
  }
  
  console.warn("[sendTicketEmail] ⚠️ Could not fetch event details");
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
    const js = await safeFetch(url);
    
    if (!js) continue;
    
    if (js.logoUrl) return js.logoUrl;
    if (js.logo_url) return js.logo_url;
    if (js.url) return js.url;
    if (typeof js === "string" && js.trim()) return js.trim();
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

  if (!doc?. email) {
    throw new Error("Recipient email missing");
  }

  console.log("[sendTicketEmail] 📧 Starting for:", entity, String(doc._id || doc.id));

  // ✅ FETCH EVENT DETAILS
  let eventDetails = null;
  try {
    eventDetails = await fetchEventDetails();
  } catch (e) {
    console.warn("[sendTicketEmail] Event details error:", e.message);
  }

  // ✅ FETCH ADMIN LOGO
  let logoUrl = "";
  try {
    logoUrl = await fetchAdminLogo();
  } catch (e) {
    console.warn("[sendTicketEmail] Logo fetch error:", e.message);
  }

  // Handle nested data structure
  const getField = (field) => {
    if (doc[field] !== undefined) return doc[field];
    return doc.data?.[field];
  };

  // Get backend and frontend URLs
  const backendUrl = process.env.BACKEND_URL || process.env.API_BASE || "";
  const frontendUrl = frontendBase || process.env.FRONTEND_BASE || "";

  console.log("[sendTicketEmail] Backend URL:", backendUrl);
  console.log("[sendTicketEmail] Frontend URL:", frontendUrl);

  if (!backendUrl || !/^https?:\/\//i.test(backendUrl)) {
    console.error("[sendTicketEmail] ❌ BACKEND_URL not set!  Download button will NOT work!");
    console.error("[sendTicketEmail] Add to .env: BACKEND_URL=http://localhost:5000");
  }

  // Build email payload
  const emailPayload = await buildTicketEmail({
    frontendBase:  frontendUrl,
    entity,
    id: String(doc._id || doc.id),
    name: getField("name") ??  doc.name,
    company: getField("company") ?? doc.company,
    ticket_category: getField("ticket_category") ?? doc.ticket_category,
    logoUrl:  logoUrl || "",
    form:  {
      ...(doc.data ??  doc),
      eventDetails, // ✅ Pass fetched event details
    },
    pdfBase64: null, // ✅ NO attachment
    upgradeUrl: config.allowUpgrade ? undefined : "",
  });

  // Override subject if needed
  if (config.subjectPrefix) {
    emailPayload. subject = `RailTrans Expo — ${config.subjectPrefix}`;
  }

  console.log("[sendTicketEmail] 📨 Sending to:", doc.email);
  console.log("[sendTicketEmail] Subject:", emailPayload.subject);

  const result = await mailer.sendMail({
    to: doc.email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
    attachments: [], // ✅ Always empty
  });

  // Return standardized result
  if (result && result.success) {
    console.log("[sendTicketEmail] ✅ Email sent successfully");
    return {
      success: true,
      info: result.info,
      messageId: result.info?. messageId,
      dbRecordId: result.dbRecordId,
    };
  } else {
    console. error("[sendTicketEmail] ❌ Email failed:", result?. error);
    return {
      success:  false,
      error: result?. error || "Mail send failed",
      dbRecordId: result?.dbRecordId,
    };
  }
};