// badgeGenerator.js — RailTrans Expo 2026
"use strict";

const fs      = require("fs");
const path    = require("path");
const PDF     = require("pdfkit");
const QRCode  = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const C       = require("./badgeConfig");

// ── safeImage ────────────────────────────────────────────────────────────────
// Try the resolved path first, then a handful of common fallback locations.
// Returns true if the image was drawn, false if it could not be found.

function safeImage(doc, filePath, x, y, width, extraOpts = {}) {
  if (!filePath) return false;

  const candidates = [
    filePath,
    path.join(process.cwd(), filePath),
    path.join(__dirname, "..", "assets", "logos", path.basename(filePath)),
    path.join(__dirname, "..", "assets", "bg",    path.basename(filePath)),
    path.join(process.cwd(), "assets", "logos",   path.basename(filePath)),
    path.join(process.cwd(), "assets", "bg",      path.basename(filePath)),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        doc.image(p, x, y, { width, ...extraOpts });
        console.log(`✓ ${path.basename(p)}`);
        return true;
      } catch (e) {
        console.warn(`! Error loading ${path.basename(p)}: ${e.message}`);
      }
    }
  }

  console.warn(`✗ Missing: ${path.basename(filePath)}`);
  return false;
}

// ── roundedRect ──────────────────────────────────────────────────────────────

function roundedRect(doc, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  doc
    .moveTo(x + r, y)
    .lineTo(x + w - r, y).quadraticCurveTo(x + w, y,     x + w, y + r)
    .lineTo(x + w, y + h - r).quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h).quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r).quadraticCurveTo(x, y, x + r, y)
    .closePath();
}

// ── drawLabelPill ────────────────────────────────────────────────────────────
// Draws a small dark-blue rounded-rectangle label (e.g. "ORGANISED BY")

function drawLabelPill(doc, text, x, y, bgColor, textColor) {
  doc.font("Helvetica-Bold").fontSize(6);
  const tw = doc.widthOfString(text);
  const pw = tw + 12;
  const ph = 13;
  roundedRect(doc, x, y, pw, ph, 3);
  doc.fill(bgColor);
  doc.fillColor(textColor)
     .font("Helvetica-Bold")
     .fontSize(6)
     .text(text, x + 6, y + 3.5, { width: tw, lineBreak: false });
}

// ── hexToRgb ─────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// ── generateBadgePDF ─────────────────────────────────────────────────────────

async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { mode = "email" } = options;

      // Ticket code -----------------------------------------------------------
      const ticketCode =
        data?.ticket_code || data?.ticketCode || data?.data?.ticket_code;
      if (!ticketCode) throw new Error("ticket_code missing");

      // Badge theme -----------------------------------------------------------
      const isPaid =
        Boolean(data.txId) ||
        data.paid === true ||
        Number(data.amount) > 0;

      console.log(`Entity: ${entity}  isPaid: ${isPaid}`);
      const { ribbon: ribbonLabel, color: themeColor } =
        getBadgeTheme({ entity, isPaid });
      console.log(`Badge: [${ribbonLabel}]  for: ${data.name || "(no name)"}`);

      // PDF setup -------------------------------------------------------------
      const doc = new PDF({ size: [C.PAGE.width, C.PAGE.height], margin: 0 });
      const buffers = [];
      doc.on("data", b => buffers.push(b));
      doc.on("end",  () => resolve(Buffer.concat(buffers)));

      // ═══════════════════════════════════════════════════════════════════════
      // 1. TOP STRIP — thin coloured bar matching the ribbon
      // ═══════════════════════════════════════════════════════════════════════
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height)
         .fill(themeColor);

      // ═══════════════════════════════════════════════════════════════════════
      // 2. HEADER — cream background + RailTrans logo + Mandapam logo
      // ═══════════════════════════════════════════════════════════════════════
      doc.rect(0, C.HEADER.y, C.PAGE.width, C.HEADER.height)
         .fill(C.HEADER.bgColor);

      // Left: full RailTrans branding logo
      safeImage(doc, C.LOGO_RAILTRANS.path,
        C.LOGO_RAILTRANS.x, C.LOGO_RAILTRANS.y, C.LOGO_RAILTRANS.width);

      // Right: Bharat Mandapam logo
      safeImage(doc, C.MANDAPAM.path,
        C.MANDAPAM.x, C.MANDAPAM.y, C.MANDAPAM.width);

      // Optional standalone date/month/venue (only when logo doesn't have them)
      if (C.DATE_BOX_03.enabled) {
        const d = C.DATE_BOX_03;
        doc.rect(d.x, d.y, d.w, d.h).fill(d.bgColor);
        doc.fillColor(d.textColor).font("Helvetica-Bold").fontSize(d.fontSize)
           .text(d.text, d.x, d.y + 8, { width: d.w, align: "center" });
      }
      if (C.DATE_BOX_04.enabled) {
        const d = C.DATE_BOX_04;
        doc.rect(d.x, d.y, d.w, d.h).fill(d.bgColor);
        doc.fillColor(d.textColor).font("Helvetica-Bold").fontSize(d.fontSize)
           .text(d.text, d.x, d.y + 8, { width: d.w, align: "center" });
      }
      if (C.MONTH_YEAR.enabled) {
        const m = C.MONTH_YEAR;
        doc.fillColor(m.color).font(m.font).fontSize(m.fontSize).text(m.text, m.x, m.y);
      }
      if (C.VENUE.enabled) {
        const v = C.VENUE;
        doc.fillColor(v.color).font(v.font).fontSize(v.fontSize).text(v.text, v.x, v.y);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 3. TAGLINE BAR — light-grey strip with outline pill
      // ═══════════════════════════════════════════════════════════════════════
      doc.rect(0, C.TAGLINE.y, C.PAGE.width, C.TAGLINE.height)
         .fill(C.TAGLINE.bgColor);

      {
        const tg = C.TAGLINE;
        doc.font("Helvetica-Bold").fontSize(tg.fontSize);
        const tw   = doc.widthOfString(tg.text);
        const pw   = Math.min(tw + 28, C.PAGE.width - 16);
        const ph   = tg.height - 8;
        const px   = (C.PAGE.width - pw) / 2;
        const py   = tg.y + 4;

        // White-filled outline pill
        roundedRect(doc, px, py, pw, ph, ph / 2);
        doc.fillAndStroke(tg.pillBgColor, tg.pillBorderColor);

        // Text inside pill
        doc.fillColor(tg.textColor)
           .font("Helvetica-Bold")
           .fontSize(tg.fontSize)
           .text(tg.text, px + 10, py + (ph - tg.fontSize) / 2 + 1, {
             width: pw - 20, align: "center", lineBreak: false,
           });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 4. BODY BACKGROUND — bg.jpeg washed out with white overlay
      // ═══════════════════════════════════════════════════════════════════════
      const bodyH = C.BODY.endY - C.BODY.startY;  // 546 - 146 = 400

      // 4a. Solid colour base (shows if image missing)
      doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH)
         .fill(C.BODY.bgColor);

      // 4b. Draw background image stretched to fill the body zone
      safeImage(doc, C.BODY.bgImage, 0, C.BODY.startY, C.PAGE.width,
        { height: bodyH });

      // 4c. White opacity overlay — drawn as a semi-transparent rectangle.
      // PDFKit supports opacity via doc.opacity() but it affects everything
      // drawn after. We use a white rect with specific opacity instead.
      if (C.BODY.overlayOpacity > 0) {
        // Convert 0-255 opacity value to 0-1 for PDFKit
        const alpha = C.BODY.overlayOpacity / 255;
        doc.save();
        doc.opacity(alpha);
        doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH).fill("#FFFFFF");
        doc.restore();
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 5. QR CARD — white rounded rectangle centred in the body
      // ═══════════════════════════════════════════════════════════════════════
      const qc = C.QR_CARD;

      // Card background
      roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.fill(qc.bgColor);

      // Card border
      doc.strokeColor(qc.borderColor).lineWidth(qc.borderWidth);
      roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.stroke();

      // QR code — centred inside card
      const qrPayload = mode === "scan"
        ? ticketCode
        : JSON.stringify({ ticket_code: ticketCode, entity });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width:  C.QR.size * 3,
      });
      const qrBuf = Buffer.from(qrDataUrl.split(",")[1], "base64");
      const qrX   = qc.x + (qc.width  - C.QR.size) / 2;
      const qrY   = qc.y + (qc.height - C.QR.size) / 2;
      doc.image(qrBuf, qrX, qrY, { width: C.QR.size });

      // ═══════════════════════════════════════════════════════════════════════
      // 6. NAME & COMPANY — below the QR card
      // ═══════════════════════════════════════════════════════════════════════
      const name = (
        data.name ||
        data.full_name ||
        (data.firstName ? `${data.firstName} ${data.lastName || ""}` : "")
      ).trim().toUpperCase();

      const company = (
        data.company || data.organization || data.companyName || ""
      ).trim();

      if (name) {
        doc.fillColor("#000000")
           .font("Helvetica-Bold")
           .fontSize(C.TEXT_AREA.nameFontSize)
           .text(name, 0, C.TEXT_AREA.nameY,
             { align: "center", width: C.PAGE.width });
      }
      if (company) {
        doc.fillColor("#333333")
           .font("Helvetica")
           .fontSize(C.TEXT_AREA.companyFontSize)
           .text(company, 0, C.TEXT_AREA.companyY,
             { align: "center", width: C.PAGE.width });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 7. FOOTER LOGOS — overlaid on body bg, no white block
      // ═══════════════════════════════════════════════════════════════════════

      // "ORGANISED BY" pill + Urban Infra logo
      const org = C.ORGANISED_BY;
      drawLabelPill(doc, org.label,
        org.labelX, org.labelY, org.labelBgColor, org.labelTextColor);
      safeImage(doc, org.logoPath, org.logoX, org.logoY, org.logoWidth);

      // "IN ASSOCIATION WITH" pill + two association logos
      const assoc = C.ASSOCIATION;
      drawLabelPill(doc, assoc.label,
        assoc.labelX, assoc.labelY, assoc.labelBgColor, assoc.labelTextColor);
      safeImage(doc, assoc.logo1Path, assoc.logo1X, assoc.logo1Y, assoc.logo1Width);
      safeImage(doc, assoc.logo2Path, assoc.logo2X, assoc.logo2Y, assoc.logo2Width);

      // ═══════════════════════════════════════════════════════════════════════
      // 8. RIBBON — large bold block at the very bottom
      // ═══════════════════════════════════════════════════════════════════════
      doc.rect(0, C.RIBBON.y, C.PAGE.width, C.RIBBON.height)
         .fill(themeColor);

      const ribbonTextY =
        C.RIBBON.y + (C.RIBBON.height - C.RIBBON.textSize) / 2 - 2;

      doc.fillColor(C.RIBBON.textColor)
         .font(C.RIBBON.font)
         .fontSize(C.RIBBON.textSize)
         .text(ribbonLabel, 0, ribbonTextY,
           { align: "center", width: C.PAGE.width });

      doc.end();

    } catch (err) {
      console.error("Badge generation error:", err);
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };