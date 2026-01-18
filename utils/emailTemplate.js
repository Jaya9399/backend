/**
 * emailTemplate.js
 *
 * buildTicketEmail(... ) - email template builder for ticket delivery
 *
 * ✅ NO PDF ATTACHMENT - badge only via download button
 * ✅ Event details passed from caller (no fetch needed)
 * ✅ Professional responsive design
 * ✅ FIXED:  Download URLs use query params (? entity=visitors&id=xxx)
 * ✅ UPGRADE SUPPORT: Shows upgrade messaging when isUpgrade=true
 */

function getEnvFrontendBase() {
  try {
    if (typeof process !== "undefined" && process.env) {
      const env =
        process.env.FRONTEND_BASE ||
        process.env.REACT_APP_FRONTEND_BASE ||
        process.env.PUBLIC_BASE_URL ||
        "";
      if (env && String(env).trim()) return String(env).replace(/\/$/, "");
    }
  } catch (e) { }
  return "";
}

function getEnvApiBase() {
  try {
    if (typeof process !== "undefined" && process.env) {
      const env =
        process.env.BACKEND_URL ||
        process.env.API_BASE ||
        process.env.REACT_APP_API_BASE ||
        "";
      if (env && String(env).trim()) return String(env).replace(/\/$/, "");
    }
  } catch (e) { }
  return "";
}

function buildAbsolute(base, path) {
  if (!base) return path || "";
  const b = String(base).replace(/\/$/, "");
  if (!path) return b;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return b + path;
  return b + "/" + path.replace(/^\//, "");
}

function normalizeForEmailUrl(url, base) {
  if (!url) return "";
  const s = String(url).trim();
  if (!s) return "";
  if (s.startsWith("data:")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  const effectiveBase = base || getEnvFrontendBase() || "";
  if (!effectiveBase) return s;
  if (s.startsWith("/")) return effectiveBase + s;
  return effectiveBase + "/" + s.replace(/^\//, "");
}

function getEventFromForm(form) {
  const out = { name: "", dates: "", time: "", venue: "", tagline: "" };
  if (!form || typeof form !== "object") return out;

  // Check for eventDetails object first
  if (form.eventDetails && typeof form.eventDetails === "object") {
    const ed = form.eventDetails;
    return {
      name: ed.name || "",
      dates: ed.dates || ed.date || "",
      time: ed.time || "",
      venue: ed.venue || "",
      tagline: ed.tagline || "",
    };
  }

  // Fallback to form-level fields
  out.name = form.eventName || form.event_name || form.eventTitle || "";
  out.dates = form.eventDates || form.event_dates || form.dates || form.date || "";
  out.time = form.eventTime || form.event_time || form.time || "";
  out.venue = form.eventVenue || form.event_venue || form.venue || "";
  out.tagline = form.eventTagline || form.tagline || "";

  return out;
}

function determineRoleLabel(visitor = {}, explicitTicketCategory = "") {
  if (explicitTicketCategory && String(explicitTicketCategory).trim()) {
    const c = String(explicitTicketCategory).trim().toLowerCase();
    if (c.includes("partner")) return "PARTNER";
    if (c.includes("award")) return "AWARDEE";
    if (/(delegate|vip|combo|paid)/i.test(c)) return "DELEGATE";
  }

  if (!visitor || typeof visitor !== "object") return "VISITOR";

  const ent = String(visitor.entity || visitor.role || visitor.type || "").toLowerCase();
  if (ent.includes("partner")) return "PARTNER";
  if (ent.includes("award")) return "AWARDEE";

  const total = Number(visitor.ticket_total || visitor.total || visitor.amount || visitor.price || 0) || 0;
  if (!Number.isNaN(total) && total > 0) return "DELEGATE";

  const cat = String(visitor.ticket_category || visitor.ticketCategory || visitor.category || "").toLowerCase();
  if (cat.includes("partner")) return "PARTNER";
  if (cat.includes("award")) return "AWARDEE";
  if (/(delegate|vip|combo|paid)/i.test(cat)) return "DELEGATE";

  if (visitor.isPartner || visitor.partner) return "PARTNER";
  if (visitor.isAwardee || visitor.awardee) return "AWARDEE";

  return "VISITOR";
}

/**
 * buildTicketEmail(...)
 * 
 * ✅ NO PDF ATTACHMENT - user must click download button
 * ✅ Event details from form. eventDetails (passed by caller)
 * ✅ FIXED: Download URL uses query params
 * ✅ UPGRADE SUPPORT: Shows upgrade banner when form.isUpgrade=true
 */
async function buildTicketEmail({
  frontendBase = "",
  entity = "attendee",
  id = "",
  name = "",
  company = "",
  ticket_category = "",
  badgePreviewUrl = "",
  downloadUrl = "",
  upgradeUrl = "",
  logoUrl = "",
  form = null,
  pdfBase64 = null,
} = {}) {
  const effectiveFrontend = String(frontendBase || getEnvFrontendBase() || "").replace(/\/$/, "");
  const effectiveBackend = String(getEnvApiBase() || effectiveFrontend || "").replace(/\/$/, "");

  console.log("[emailTemplate] ========================================");
  console.log("[emailTemplate] Backend URL:", effectiveBackend);
  console.log("[emailTemplate] Frontend URL:", effectiveFrontend);
  console.log("[emailTemplate] Entity:", entity);
  console.log("[emailTemplate] ID:", id);

  // ✅ Use passed event details (no fetch)
  const ev = getEventFromForm(form);

  // Use default values if nothing provided
  if (!ev.name) ev.name = "RailTrans Expo 2026";
  if (!ev.dates) ev.dates = "To Be Announced";
  if (!ev.time) ev.time = "To Be Announced";
  if (!ev.venue) ev.venue = "To Be Announced";

  const resolvedLogo = normalizeForEmailUrl(logoUrl || "", effectiveFrontend);
  const resolvedBadgePreview = normalizeForEmailUrl(badgePreviewUrl || "", effectiveFrontend);

  // ✅ FIXED: Download URL with QUERY PARAMS (not path params)
  const resolvedDownload = `${effectiveBackend}/api/tickets/download?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}`;

  console.log("[emailTemplate] Download URL:", resolvedDownload);

  // ✅ Frontend upgrade URL (visitors only)
  let resolvedUpgrade = normalizeForEmailUrl(upgradeUrl || "", effectiveFrontend);
  if (entity === "visitors" && !resolvedUpgrade) {
    const ticketCode = form?.ticket_code || "";
    resolvedUpgrade = `${effectiveFrontend}/ticket-upgrade?entity=visitors&${id ? `id=${encodeURIComponent(String(id))}` : `ticket_code=${encodeURIComponent(ticketCode)}`
      }`;
  }

  // ✅ Check if this is an upgrade email
  const isUpgrade = form?.isUpgrade || false;
  const previousCategory = form?.previousCategory || null;

  const effectiveTicketCategory = ticket_category || (form && (form.ticket_category || form.category)) || "";
  const ticketLabelForTemplate = determineRoleLabel(form || {}, effectiveTicketCategory);

  console.log("[emailTemplate] Upgrade:", { isUpgrade, previousCategory, ticketLabelForTemplate });
  console.log("[emailTemplate] ========================================");

  // ✅ Dynamic subject based on upgrade
  const subject = isUpgrade
    ? `RailTrans Expo 2026 — Your Ticket Has Been Upgraded to ${ticketLabelForTemplate || effectiveTicketCategory}`
    : `RailTrans Expo 2026 — Your E‑Badge & Registration Confirmation`;

  // ✅ Dynamic intro based on upgrade
  const introText = isUpgrade
    ? `Great news! Your ticket has been successfully upgraded${previousCategory ? ` from ${previousCategory}` : ""} to ${effectiveTicketCategory}. `
    : "Thank you for registering for RailTrans Expo 2026.";

  const text = [
    `Dear ${name || "Participant"},`,
    "",
    introText,
    "",
    previousCategory && isUpgrade ? `Previous Category: ${previousCategory}` : "",
    ticketLabelForTemplate ? `${isUpgrade ? "New " : ""}Ticket Category: ${ticketLabelForTemplate}` : "",
    entity ? `Registration Type: ${entity}` : "",
    company ? `Company: ${company}` : "",
    "",
    `Download your ${isUpgrade ? "updated " : ""}E‑Badge:  ${resolvedDownload}`,
    entity === "visitors" && resolvedUpgrade ? `Upgrade your ticket${isUpgrade ? " further" : ""}:  ${resolvedUpgrade}` : "",
    "",
    "Event Details:",
    `Event Name: ${ev.name}`,
    `Dates: ${ev.dates}`,
    `Time: ${ev.time}`,
    `Venue: ${ev.venue}`,
    "",
    "Important Information & Guidelines:",
    "- Entry permitted only through Gate No. 4 and Gate No. 10.",
    "- Present your E‑badge at the entry point for scanning.",
    "- Physical badges available at on‑site registration counter.",
    "- Badge is strictly non‑transferable and must be worn visibly.",
    "- Entry for individuals aged 18+ only.",
    "- Valid Government‑issued photo ID required.",
    "- Organizers reserve right of admission.",
    "- Smoking, tobacco, banned substances strictly prohibited.",
    "- Paid parking available at Bharat Mandapam basement.",
    "",
    "We look forward to welcoming you! ",
    "",
    "Warm regards,",
    "Team RailTrans Expo 2026",
    "support@railtransexpo.com",
  ]
    .filter(Boolean)
    .join("\n");

  const showUpgradeButton = entity === "visitors" && Boolean(resolvedUpgrade);
  const upgradeButtonHtml = showUpgradeButton
    ? `<a href="${resolvedUpgrade}" class="cta-outline" target="_blank" rel="noopener noreferrer">🎟️ ${isUpgrade ? "Upgrade Further" : "Upgrade Ticket"}</a>`
    : "";

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            color: #1f2937; 
            background:  #f9fafb; 
            margin: 0; 
            padding: 0; 
            line-height: 1.6;
            -webkit-font-smoothing: antialiased; 
          }
          .container { 
            max-width: 680px; 
            margin: 40px auto; 
            background: #ffffff; 
            border-radius:  12px; 
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          }
          .header { 
            text-align: center; 
            padding: 32px 24px 24px;
            background: linear-gradient(135deg, #0b4f60 0%, #19a6e7 100%);
          }
          .logo { 
            height: 80px; 
            width: auto; 
            object-fit: contain; 
            display: inline-block;
            background: white;
            padding: 12px 24px;
            border-radius: 8px;
          }
          .content { 
            padding: 32px 24px; 
          }
          .greeting { 
            font-size:  18px; 
            font-weight: 600; 
            color: #0b4f60; 
            margin-bottom: 16px; 
          }
          .intro { 
            color: #4b5563; 
            font-size: 15px; 
            line-height: 1.6; 
            margin-bottom:  24px; 
          }
          .upgrade-banner {
            margin:  16px 0;
            padding:  16px;
            background:  #dcfce7;
            border-left: 4px solid #16a34a;
            border-radius: 6px;
          }
          . upgrade-banner-title {
            color: #166534;
            font-weight: 700;
            font-size: 16px;
            margin-bottom:  8px;
          }
          .upgrade-banner-text {
            color: #15803d;
            font-size: 14px;
          }
          .card { 
            background: #f1f5f9; 
            border-radius: 10px; 
            padding: 20px; 
            border: 1px solid #e2e8f0; 
            margin:  20px 0; 
          }
          .card-title { 
            font-weight: 700; 
            color: #0b4f60; 
            font-size: 17px; 
            margin-bottom: 12px; 
            text-align: center; 
          }
          .meta-row { 
            display: flex; 
            gap: 12px; 
            justify-content: center; 
            flex-wrap: wrap; 
            margin:  16px 0; 
          }
          .meta-badge { 
            background: #ffffff; 
            padding: 8px 16px; 
            border-radius: 6px; 
            border:  1px solid #cbd5e1; 
            color: #475569; 
            font-size: 13px; 
            font-weight: 500;
          }
          .meta-badge-upgraded {
            background: #dcfce7;
            color: #166534;
            border-color:  #86efac;
          }
          . button-row { 
            display:  flex; 
            gap: 16px; 
            align-items: center; 
            justify-content: center; 
            margin-top: 24px; 
            flex-wrap: wrap; 
          }
          
          /* ✅ RED DOWNLOAD BUTTON (Primary Action) */
          .cta { 
            display: inline-block; 
            padding: 16px 32px; 
            background: #dc2626 ! important;
            color: #ffffff !important; 
            text-decoration: none ! important; 
            border-radius: 8px; 
            font-weight: 700; 
            font-size:  16px;
            border: none;
            box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);
            transition: all 0.3s ease;
            text-align: center;
            min-width: 200px;
          }
          .cta:hover {
            background: #b91c1c ! important;
            box-shadow: 0 6px 8px rgba(220, 38, 38, 0.4);
            transform: translateY(-2px);
          }
          
          /* ✅ BLUE UPGRADE BUTTON (Secondary Action) */
          .cta-outline { 
            display: inline-block; 
            padding: 16px 32px; 
            background: #2563eb !important;
            color: #ffffff !important; 
            text-decoration: none !important; 
            border-radius:  8px; 
            font-weight: 700; 
            font-size: 16px;
            border: none;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
            transition: all 0.3s ease;
            text-align: center;
            min-width: 200px;
          }
          . cta-outline:hover {
            background: #1d4ed8 !important;
            box-shadow: 0 6px 8px rgba(37, 99, 235, 0.4);
            transform: translateY(-2px);
          }
          
          .section { 
            margin-top: 28px; 
          }
          . section-title { 
            margin:  0 0 12px 0; 
            color: #0b4f60; 
            font-size: 16px;
            font-weight: 700;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
          }
          .info-row { 
            display: flex; 
            margin-bottom: 10px; 
            align-items: flex-start; 
          }
          .info-label { 
            width: 120px; 
            color: #64748b; 
            font-weight: 600; 
            font-size:  14px;
          }
          .info-value { 
            color: #1f2937; 
            flex: 1;
            font-size: 14px;
          }
          . guidelines { 
            margin-top: 28px; 
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px 20px;
            border-radius:  6px;
          }
          .guidelines-title { 
            margin:  0 0 12px 0; 
            color: #92400e; 
            font-size: 16px;
            font-weight: 700;
          }
          .guidelines ul { 
            padding-left: 20px; 
            color: #78350f; 
            margin: 0;
            font-size: 14px;
          }
          .guidelines li {
            margin-bottom: 8px;
          }
          .footer { 
            margin-top:  32px; 
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280; 
            font-size: 13px; 
            text-align: center; 
          }
          .footer a {
            color: #0b4f60;
            text-decoration: none;
          }
          
          /* Mobile Responsive */
          @media (max-width: 600px) {
            .container { margin: 20px 12px; }
            .content { padding: 24px 16px; }
            .logo { height: 60px; padding: 8px 16px; }
            .button-row { 
              flex-direction: column; 
              width: 100%; 
              gap: 12px;
            }
            .cta, .cta-outline { 
              width: 100%; 
              min-width: auto;
              box-sizing: border-box; 
            }
            .info-label { width: 100px; font-size: 13px; }
            .info-value { font-size: 13px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${resolvedLogo ? `<img src="${resolvedLogo}" alt="RailTrans Expo Logo" class="logo" />` : `<div style="color: white; font-size: 24px; font-weight: bold;">RailTrans Expo 2026</div>`}
          </div>
    
          <div class="content">
            <div class="greeting">Dear ${name || "Participant"},</div>
    
            <p class="intro">
              ${isUpgrade
      ? `Great news! Your ticket has been successfully upgraded${previousCategory ? ` from <strong>${previousCategory}</strong>` : ""} to <strong>${ticketLabelForTemplate || effectiveTicketCategory}</strong>! `
      : `Thank you for registering for <strong>RailTrans Expo 2026</strong>. We are delighted to confirm your registration and look forward to welcoming you to India's premier railway infrastructure event.`
    }
            </p>
    
            ${isUpgrade && previousCategory ? `
            <div class="upgrade-banner">
              <div class="upgrade-banner-title">✅ Upgrade Successful!</div>
              <div class="upgrade-banner-text">
                Previous:  ${previousCategory} → New: ${ticketLabelForTemplate || effectiveTicketCategory}
              </div>
            </div>
            ` : ""}
    
            <div class="card">
              <div class="card-title">${name || "Participant"}${company ? ` • ${company}` : ""}</div>
    
              <div class="meta-row">
                ${ticketLabelForTemplate ? `<div class="meta-badge">${ticketLabelForTemplate}</div>` : ""}
                ${entity ? `<div class="meta-badge">${entity.toUpperCase()}</div>` : ""}
                ${isUpgrade ? `<div class="meta-badge meta-badge-upgraded">UPGRADED</div>` : ""}
              </div>
    
              ${resolvedBadgePreview ? `<div style="margin-top: 16px; text-align: center;"><img src="${resolvedBadgePreview}" alt="E-badge preview" style="max-width: 100%; height: auto; border-radius: 8px; border:  1px solid #e2e8f0;"/></div>` : ""}
    
              <div class="button-row">
                <a href="${resolvedDownload}" class="cta" target="_blank" rel="noopener noreferrer">
                  📥 Download ${isUpgrade ? "Updated " : ""}E‑Badge
                </a>
                ${upgradeButtonHtml}
              </div>
            </div>
    
            <div class="section">
              <h4 class="section-title">📅 Event Information</h4>
              <div class="info-row">
                <div class="info-label">Event Name: </div>
                <div class="info-value">${ev.name}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Dates:</div>
                <div class="info-value">${ev.dates}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Time: </div>
                <div class="info-value">${ev.time}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Venue:</div>
                <div class="info-value">${ev.venue}</div>
              </div>
              ${ev.tagline ? `<div class="info-row"><div class="info-label">About: </div><div class="info-value">${ev.tagline}</div></div>` : ""}
            </div>
    
            <div class="guidelines">
              <h4 class="guidelines-title">⚠️ Important Guidelines</h4>
              <ul>
                <li>Entry permitted only through <strong>Gate No. 4 and Gate No. 10</strong></li>
                <li>Present your <strong>E‑badge</strong> at entry point for scanning</li>
                <li>Physical badge available at <strong>on‑site registration counter</strong></li>
                <li>Badge is <strong>strictly non‑transferable</strong> and must be worn visibly</li>
                <li>Entry for individuals <strong>aged 18+</strong> only</li>
                <li>Valid <strong>Government‑issued photo ID</strong> required (Passport for foreign nationals)</li>
                <li>Organizers reserve right of admission; security frisking at all entry points</li>
                <li>Smoking, tobacco, banned substances <strong>strictly prohibited</strong></li>
                <li>Paid parking available at Bharat Mandapam basement</li>
              </ul>
            </div>
    
            <div class="footer">
              <p>We look forward to welcoming you at <strong>RailTrans Expo 2026</strong></p>
              <p style="margin:  8px 0 0 0;">
                <strong>Team RailTrans Expo 2026</strong><br/>
                <a href="mailto: support@railtransexpo.com">support@railtransexpo.com</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>`;

  const attachments = [];

  return { subject, text, html, attachments };
}


module.exports = { buildTicketEmail };