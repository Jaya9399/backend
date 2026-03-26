// badgeGenerator.js — RailTrans Expo 2026
"use strict";

const fs     = require("fs");
const path   = require("path");
const PDF    = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const C      = require("./badgeConfig");

// ── Helpers ───────────────────────────────────────────────────────────────────

// Safe image loader with better error handling
function safeImg(doc, filePath, x, y, width) {
  if (!filePath) {
    console.warn("[badge] No file path provided");
    return false;
  }
  
  // Try multiple possible paths
  const possiblePaths = [
    filePath,
    path.join(process.cwd(), filePath),
    path.join(__dirname, "..", "assets", "logos", path.basename(filePath)),
    path.join(__dirname, "..", "..", "assets", "logos", path.basename(filePath))
  ];
  
  let loaded = false;
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      try {
        doc.image(tryPath, x, y, { width });
        console.log(`[badge] Loaded image: ${tryPath}`);
        loaded = true;
        break;
      } catch (err) {
        console.warn(`[badge] Failed to load ${tryPath}:`, err.message);
      }
    }
  }
  
  if (!loaded) {
    console.warn(`[badge] Could not load image: ${path.basename(filePath)}`);
    // Draw placeholder rectangle
    doc.rect(x, y, width, width * 0.5).fill("#E5E7EB");
    doc.fillColor("#9CA3AF").fontSize(8).text("Logo", x + 5, y + 5);
  }
  return loaded;
}

// Rounded rectangle path
function rrect(doc, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  doc
    .moveTo(x + r, y)
    .lineTo(x + w - r, y).quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r).quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h).quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r).quadraticCurveTo(x, y, x + r, y)
    .closePath();
}

// Vertical gradient
function vGradient(doc, x, y, w, h, hexTop, hexBottom) {
  const steps = 60;
  const p = hex => {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = p(hexTop);
  const [r2, g2, b2] = p(hexBottom);
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const hex = "#" + [
      Math.round(r1 + (r2 - r1) * t),
      Math.round(g1 + (g2 - g1) * t),
      Math.round(b1 + (b2 - b1) * t),
    ].map(v => v.toString(16).padStart(2, "0")).join("");
    doc.rect(x, y + i * sh, w, sh + 0.5).fill(hex);
  }
}

// Pill border label
function pillLabel(doc, x, y, text, fontSize, borderColor, textColor, radius) {
  doc.save();
  doc.font("Helvetica-Bold").fontSize(fontSize);
  const tw = doc.widthOfString(text);
  const pw = tw + 18;
  const ph = fontSize + 7;
  doc.strokeColor(borderColor).lineWidth(0.8);
  rrect(doc, x, y, pw, ph, radius);
  doc.stroke();
  doc.fillColor(textColor).text(text, x + 9, y + 4, { lineBreak: false });
  doc.restore();
}

// ── Allowed entities ──────────────────────────────────────────────────────────
const ALLOWED = ["visitors", "exhibitors", "partners", "speakers", "awardees"];

// ── Main export ───────────────────────────────────────────────────────────────
async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!ALLOWED.includes(entity)) throw new Error(`Unsupported entity: ${entity}`);

      const { mode = "email", showFooter = true } = options;

      const ticketCode =
        data?.ticket_code || data?.ticketCode || data?.data?.ticket_code;
      if (!ticketCode) throw new Error("ticket_code missing");

      const isPaid =
        Boolean(data.txId) || data.paid === true || Number(data.amount || 0) > 0;

      const { ribbon: ribbonLabel, color: themeColor } = getBadgeTheme({ entity, isPaid });

      const doc = new PDF({ size: [C.PAGE.width, C.PAGE.height], margin: 0 });
      const buffers = [];
      doc.on("data", chunk => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // ═══════════════════════════════════════════════════════════════
      // 1. TOP COLOR STRIP
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height)
         .fill(themeColor);

      // ═══════════════════════════════════════════════════════════════
      // 2. HEADER with Event Title
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.HEADER.y, C.PAGE.width, C.HEADER.height)
         .fill(C.HEADER.bgColor);

      // Header bottom border
      doc.save()
         .strokeColor(C.HEADER.borderBottomColor).lineWidth(1)
         .moveTo(0, C.HEADER.y + C.HEADER.height)
         .lineTo(C.PAGE.width, C.HEADER.y + C.HEADER.height)
         .stroke().restore();

      // RailTrans logo - left side
      safeImg(doc, C.LOGO_RAILTRANS.path, C.LOGO_RAILTRANS.x, C.LOGO_RAILTRANS.y, C.LOGO_RAILTRANS.width);

      // Bharat Mandapam logo - right side
      safeImg(doc, C.MANDAPAM.path, C.MANDAPAM.x, C.MANDAPAM.y, C.MANDAPAM.width);

      // Main Event Title
      doc.fillColor(C.EVENT_TITLE.color)
         .font(C.EVENT_TITLE.font)
         .fontSize(C.EVENT_TITLE.fontSize)
         .text(C.EVENT_TITLE.text, 0, C.EVENT_TITLE.y, { align: "center", width: C.PAGE.width });

      // Date and Venue
      doc.fillColor(C.DATE_VENUE.color)
         .font(C.DATE_VENUE.font)
         .fontSize(C.DATE_VENUE.fontSize)
         .text(C.DATE_VENUE.text, 0, C.DATE_VENUE.y, { align: "center", width: C.PAGE.width });

      // ═══════════════════════════════════════════════════════════════
      // 3. TAGLINE ROW with pill
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.TAGLINE_ROW.y, C.PAGE.width, C.TAGLINE_ROW.height)
         .fill(C.TAGLINE_ROW.bgColor);

      doc.font(C.TAGLINE_PILL.font).fontSize(C.TAGLINE_PILL.fontSize);
      const pillW = Math.min(
        doc.widthOfString(C.TAGLINE_PILL.text) + C.TAGLINE_PILL.padH * 2,
        C.PAGE.width - 24
      );
      const pillX = (C.PAGE.width - pillW) / 2;
      const pillY = C.TAGLINE_PILL.y;
      const pillH = C.TAGLINE_PILL.height;

      doc.save();
      rrect(doc, pillX, pillY, pillW, pillH, C.TAGLINE_PILL.radius);
      doc.fill(C.TAGLINE_PILL.bgColor);
      doc.restore();

      doc.fillColor(C.TAGLINE_PILL.textColor)
         .font(C.TAGLINE_PILL.font)
         .fontSize(C.TAGLINE_PILL.fontSize)
         .text(C.TAGLINE_PILL.text,
               pillX + C.TAGLINE_PILL.padH,
               pillY + C.TAGLINE_PILL.padV,
               { width: pillW - C.TAGLINE_PILL.padH * 2, align: "center", lineBreak: false });

      // ═══════════════════════════════════════════════════════════════
      // 4. BODY with gradient and QR card
      // ═══════════════════════════════════════════════════════════════
      const bodyY = C.TAGLINE_ROW.y + C.TAGLINE_ROW.height;
      const bodyH = C.FOOTER_ZONE.y - bodyY;
      vGradient(doc, 0, bodyY, C.PAGE.width, bodyH, C.BODY.bgTop, C.BODY.bgBottom);

      // Background image
      if (fs.existsSync(C.BG_IMAGE.path)) {
        const bgY = bodyY + bodyH * 0.42;
        const bgH = bodyH - (bgY - bodyY);
        doc.save().opacity(C.BG_IMAGE.opacity);
        doc.image(C.BG_IMAGE.path, 0, bgY, { width: C.PAGE.width, height: bgH });
        doc.restore();
      }

      // White QR card
      const qc = C.QR_CARD;
      if (typeof qc.y === 'undefined') {
        throw new Error("QR_CARD.y is not defined in configuration");
      }
      
      doc.save();
      rrect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.fill(qc.bgColor);
      doc.restore();
      
      doc.save();
      doc.strokeColor(qc.borderColor).lineWidth(qc.borderWidth);
      rrect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.stroke();
      doc.restore();

      // QR code
      const qrPayload = mode === "scan"
        ? ticketCode
        : JSON.stringify({ ticket_code: ticketCode, entity });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: C.QR.size * 3,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      const qrBuf = Buffer.from(qrDataUrl.split(",")[1], "base64");
      const qrX = qc.x + (qc.width - C.QR.size) / 2;
      const qrY = qc.y + (qc.height - C.QR.size) / 2;
      doc.image(qrBuf, qrX, qrY, { width: C.QR.size });

      // ═══════════════════════════════════════════════════════════════
      // 5. NAME and COMPANY (NO ticket code)
      // ═══════════════════════════════════════════════════════════════
      const name = data.name || data.full_name || data.firstName
        ? ((data.name || data.full_name ||
           ((data.firstName || "") + " " + (data.lastName || ""))).trim().toUpperCase())
        : "VISITOR";
      
      const company = data.company || data.organization || data.companyName || "";

      let textY = qc.y + qc.height + 15;

      // Name
      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(18)
         .text(name, 0, textY, { align: "center", width: C.PAGE.width });
      textY += 24;

      // Company (if exists)
      if (company) {
        doc.fillColor("#4B5563").font("Helvetica").fontSize(11)
           .text(company, 0, textY, { align: "center", width: C.PAGE.width });
        textY += 18;
      }

      // NO ticket code printed - removed as requested

      // ═══════════════════════════════════════════════════════════════
      // 6. FOOTER LOGOS
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.FOOTER_ZONE.y, C.PAGE.width, C.FOOTER_ZONE.height)
         .fill(C.FOOTER_ZONE.bgColor);

      doc.save()
         .strokeColor(C.FOOTER_ZONE.borderTopColor).lineWidth(0.8)
         .moveTo(0, C.FOOTER_ZONE.y)
         .lineTo(C.PAGE.width, C.FOOTER_ZONE.y)
         .stroke().restore();

      pillLabel(doc, C.LABEL_ORG.x, C.LABEL_ORG.y,
        C.LABEL_ORG.text, C.LABEL_ORG.fontSize,
        C.LABEL_ORG.pillBorder, C.LABEL_ORG.textColor, C.LABEL_ORG.radius);
      safeImg(doc, C.LOGO_URBAN.path, C.LOGO_URBAN.x, C.LOGO_URBAN.y, C.LOGO_URBAN.width);

      pillLabel(doc, C.LABEL_ASSOC.x, C.LABEL_ASSOC.y,
        C.LABEL_ASSOC.text, C.LABEL_ASSOC.fontSize,
        C.LABEL_ASSOC.pillBorder, C.LABEL_ASSOC.textColor, C.LABEL_ASSOC.radius);
      safeImg(doc, C.LOGO_CHAMBER.path, C.LOGO_CHAMBER.x, C.LOGO_CHAMBER.y, C.LOGO_CHAMBER.width);
      safeImg(doc, C.LOGO_RAILWAY.path, C.LOGO_RAILWAY.x, C.LOGO_RAILWAY.y, C.LOGO_RAILWAY.width);

      // ═══════════════════════════════════════════════════════════════
      // 7. RIBBON with role label
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.RIBBON.y, C.PAGE.width, C.RIBBON.height)
         .fill(themeColor);

      const ribbonTextY = C.RIBBON.y + Math.floor((C.RIBBON.height - C.RIBBON.textSize) / 2);
      doc.fillColor(C.RIBBON.textColor)
         .font(C.RIBBON.font)
         .fontSize(C.RIBBON.textSize)
         .text(ribbonLabel, 0, ribbonTextY,
               { align: "center", width: C.PAGE.width,
                 characterSpacing: C.RIBBON.letterSpacing });

      doc.end();

    } catch (err) {
      console.error("[badgeGenerator] Error:", err);
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };