// badgeGenerator.js — RailTrans Expo 2026
"use strict";

const fs = require("fs");
const path = require("path");
const PDF = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const C = require("./badgeConfig");

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeImage(doc, filePath, x, y, width, extraOpts = {}) {
  if (!filePath) return false;
  const candidates = [
    filePath,
    path.join(process.cwd(), filePath),
    path.join(__dirname, "..", "assets", "logos", path.basename(filePath)),
    path.join(__dirname, "..", "assets", "bg",    path.basename(filePath)),
    path.join(__dirname, "assets", "logos",        path.basename(filePath)),
    path.join(__dirname, "assets", "bg",           path.basename(filePath)),
    path.join(process.cwd(), "public", "assets", "logos", path.basename(filePath)),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try { doc.image(p, x, y, { width, ...extraOpts }); return true; } catch (_) {}
    }
  }
  console.warn(`⚠️  Image not found: ${path.basename(filePath)}`);
  return false;
}

function roundedRect(doc, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  doc.moveTo(x + r, y)
     .lineTo(x + w - r, y).quadraticCurveTo(x + w, y, x + w, y + r)
     .lineTo(x + w, y + h - r).quadraticCurveTo(x + w, y + h, x + w - r, y + h)
     .lineTo(x + r, y + h).quadraticCurveTo(x, y + h, x, y + h - r)
     .lineTo(x, y + r).quadraticCurveTo(x, y, x + r, y)
     .closePath();
}

function drawPill(doc, text, x, y, bgColor, textColor, fontSize, padding = 14, height = 16) {
  doc.font("Helvetica-Bold").fontSize(fontSize);
  const tw = doc.widthOfString(text);
  const pw = tw + padding;
  roundedRect(doc, x, y, pw, height, height / 2);
  doc.fill(bgColor);
  doc.fillColor(textColor).font("Helvetica-Bold").fontSize(fontSize)
     .text(text, x + padding / 2, y + (height - fontSize) / 2 + 1,
       { width: tw, lineBreak: false });
}

function drawSquarePill(doc, text, x, y, w, h, bgColor, textColor, fontSize, radius = 6) {
  roundedRect(doc, x, y, w, h, radius);
  doc.fill(bgColor);
  doc.fillColor(textColor).font("Helvetica-Bold").fontSize(fontSize)
     .text(text, x, y + (h - fontSize) / 2 + 1,
       { width: w, align: "center", lineBreak: false });
}

// ── Sections ──────────────────────────────────────────────────────────────────

function drawHeader(doc) {
  const H  = C.HEADER;
  const dp = C.DATE_PILLS;
  const ep = C.EDITION_PILL;

  doc.rect(0, H.y, C.PAGE.width, H.height).fill(H.bgColor);

  // RailTrans logo — left
  safeImage(doc, C.RAILTRANS_LOGO.path, C.RAILTRANS_LOGO.x, C.RAILTRANS_LOGO.y, C.RAILTRANS_LOGO.width);

  // "6th EDITION" pill
  drawPill(doc, ep.text, ep.x, ep.y, ep.bgColor, ep.textColor, ep.fontSize, 16, 18);

  // Date squares "03" "04"
  drawSquarePill(doc, dp.pill1.text, dp.pill1.x, dp.pill1.y, dp.pill1.width, dp.pill1.height,
    dp.pill1.bgColor, dp.pill1.textColor, dp.pill1.fontSize);
  drawSquarePill(doc, dp.pill2.text, dp.pill2.x, dp.pill2.y, dp.pill2.width, dp.pill2.height,
    dp.pill2.bgColor, dp.pill2.textColor, dp.pill2.fontSize);

  // "JULY 2026" — bold, to right of date squares, clamped to page width
  const monthMaxWidth = C.PAGE.width - dp.monthX - 8;
  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(20)
     .text("JULY 2026", dp.monthX, dp.monthY,
       { width: monthMaxWidth, lineBreak: false });

  // Venue — smaller, below JULY 2026
  const venueMaxWidth = C.PAGE.width - dp.monthX - 8;
  doc.fillColor("#555555").font("Helvetica").fontSize(6.5)
     .text("BHARAT MANDAPAM, NEW DELHI, INDIA", dp.monthX, dp.venueY,
       { width: venueMaxWidth, lineBreak: false });

  // Bharat Mandapam logo — top-right
  safeImage(doc, C.MANDAPAM.path, C.MANDAPAM.x, C.MANDAPAM.y, C.MANDAPAM.width);
}

function drawTagline(doc) {
  const tg = C.TAGLINE;
  doc.rect(0, tg.y, C.PAGE.width, tg.height).fill(tg.bgColor);

  doc.font("Helvetica-Bold").fontSize(tg.fontSize);
  const tw = doc.widthOfString(tg.text);
  const pw = Math.min(tw + 40, C.PAGE.width - 20); // never wider than page
  const ph = 18;
  const px = (C.PAGE.width - pw) / 2;
  const py = tg.y + (tg.height - ph) / 2;

  roundedRect(doc, px, py, pw, ph, 9);
  doc.fillAndStroke(tg.pillBgColor, tg.pillBorderColor);

  doc.fillColor(tg.textColor).font("Helvetica-Bold").fontSize(tg.fontSize)
     .text(tg.text, px + 10, py + (ph - tg.fontSize) / 2 + 1,
       { width: pw - 20, align: "center", lineBreak: false });
}

function drawBodyBackground(doc) {
  const bodyH = C.BODY.endY - C.BODY.startY;
  doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH).fill(C.BODY.bgColor);
  safeImage(doc, C.BODY.bgImage, 0, C.BODY.startY, C.PAGE.width, { height: bodyH });

  // White overlay — higher opacity = bg image less visible
  doc.save();
  doc.opacity(C.BODY.overlayOpacity / 255);
  doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH).fill("#FFFFFF");
  doc.restore();
}

async function drawQRCard(doc, ticketCode, entity, mode) {
  const qc = C.QR_CARD;
  roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
  doc.fill(qc.bgColor);
  doc.strokeColor(qc.borderColor).lineWidth(qc.borderWidth);
  roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
  doc.stroke();

  const qrPayload = mode === "scan"
    ? ticketCode
    : JSON.stringify({ ticket_code: ticketCode, entity });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: C.QR.size * 3,
  });
  const qrBuf = Buffer.from(qrDataUrl.split(",")[1], "base64");
  doc.image(qrBuf,
    qc.x + (qc.width  - C.QR.size) / 2,
    qc.y + (qc.height - C.QR.size) / 2,
    { width: C.QR.size });
}

function drawNameAndCompany(doc, name, company) {
  if (name) {
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(C.TEXT_AREA.nameFontSize)
       .text(name, 0, C.TEXT_AREA.nameY, { align: "center", width: C.PAGE.width });
  }
  if (company) {
    doc.fillColor("#555555").font("Helvetica").fontSize(C.TEXT_AREA.companyFontSize)
       .text(company, 0, C.TEXT_AREA.companyY, { align: "center", width: C.PAGE.width });
  }
}

function drawFooter(doc) {
  const org = C.ORGANISED_BY;
  drawPill(doc, org.label, org.labelX, org.labelY,
    org.labelBgColor, org.labelTextColor, org.labelFontSize, 16, 15);
  safeImage(doc, org.logoPath, org.logoX, org.logoY, org.logoWidth);

  const assoc = C.ASSOCIATION;
  drawPill(doc, assoc.label, assoc.labelX, assoc.labelY,
    assoc.labelBgColor, assoc.labelTextColor, assoc.labelFontSize, 12, 18);
    const gap = 10;
    const logoWidth = 40;
    
    // total width = 2 logos + gap
    const totalWidth = (logoWidth * 2) + gap;
    
    // center under capsule
    const startX = assoc.labelX + 10;
    
    safeImage(doc, assoc.logo1Path, startX, assoc.logo1Y, logoWidth);
    safeImage(doc, assoc.logo2Path, startX + logoWidth + gap, assoc.logo1Y, logoWidth);
}

function drawRibbon(doc, themeColor, ribbonLabel) {
  const R = C.RIBBON;

  // Draw ribbon — starts at R.y, fills to bottom of page
  roundedRect(doc, 0, R.y, C.PAGE.width, R.height, R.borderRadius);
  doc.fill(themeColor);

  // Vertically centre text within ribbon
  const textY = R.y + (R.height / 2) - (R.textSize / 2) - 2;

  // Subtle shadow
  doc.fillColor("#000000").opacity(0.18).font(R.font).fontSize(R.textSize)
     .text(ribbonLabel, 1, textY + 1, { align: "center", width: C.PAGE.width });

  // Main label
  doc.fillColor(R.textColor).opacity(1).font(R.font).fontSize(R.textSize)
     .text(ribbonLabel, 0, textY, { align: "center", width: C.PAGE.width });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { mode = "email" } = options;

      const ticketCode = data?.ticket_code || data?.ticketCode || data?.data?.ticket_code;
      if (!ticketCode) throw new Error("ticket_code missing");

      const isPaid = Boolean(data.txId) || data.paid === true || Number(data.amount) > 0;
      const { ribbon: ribbonLabel, color: themeColor } = getBadgeTheme({ entity, isPaid });

      console.log(`[${ribbonLabel}] ${data.name || "(no name)"}`);

      const doc = new PDF({ size: [C.PAGE.width, C.PAGE.height], margin: 0 });
      const buffers = [];
      doc.on("data", b => buffers.push(b));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height).fill(themeColor);
      drawHeader(doc);
      drawTagline(doc);
      drawBodyBackground(doc);
      await drawQRCard(doc, ticketCode, entity, mode);

      const name = (data.name || data.full_name ||
        (data.firstName ? `${data.firstName} ${data.lastName || ""}` : "")).trim().toUpperCase();
      const company = (data.company || data.organization || data.companyName || "").trim();

      drawNameAndCompany(doc, name, company);
      drawFooter(doc);
      drawRibbon(doc, themeColor, ribbonLabel);

      doc.end();
    } catch (err) {
      console.error("Badge generation error:", err);
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };