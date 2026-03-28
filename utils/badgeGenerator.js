// badgeGenerator.js — RailTrans Expo 2026
"use strict";

const fs = require("fs");
const path = require("path");
const PDF = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const C = require("./badgeConfig");

// ── Helper Functions ─────────────────────────────────────────────────────────

function safeImage(doc, filePath, x, y, width, extraOpts = {}) {
  if (!filePath) return false;

  const candidates = [
    filePath,
    path.join(process.cwd(), filePath),
    path.join(__dirname, "..", "assets", "logos", path.basename(filePath)),
    path.join(__dirname, "..", "assets", "bg", path.basename(filePath)),
    path.join(__dirname, "assets", "logos", path.basename(filePath)),
    path.join(__dirname, "assets", "bg", path.basename(filePath)),
    path.join(process.cwd(), "public", "assets", "logos", path.basename(filePath)),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        doc.image(p, x, y, { width, ...extraOpts });
        return true;
      } catch (e) {
        // silent fail, try next
      }
    }
  }
  console.warn(`⚠️  Image not found: ${path.basename(filePath)}`);
  return false;
}

function roundedRect(doc, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  doc.moveTo(x + r, y)
     .lineTo(x + w - r, y)
     .quadraticCurveTo(x + w, y, x + w, y + r)
     .lineTo(x + w, y + h - r)
     .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
     .lineTo(x + r, y + h)
     .quadraticCurveTo(x, y + h, x, y + h - r)
     .lineTo(x, y + r)
     .quadraticCurveTo(x, y, x + r, y)
     .closePath();
}

function drawPill(doc, text, x, y, bgColor, textColor, fontSize, padding = 14, height = 16) {
  doc.font("Helvetica-Bold").fontSize(fontSize);
  const tw = doc.widthOfString(text);
  const pw = tw + padding;
  roundedRect(doc, x, y, pw, height, height / 2);
  doc.fill(bgColor);
  doc.fillColor(textColor)
     .font("Helvetica-Bold")
     .fontSize(fontSize)
     .text(text, x + padding / 2, y + (height - fontSize) / 2 + 1,
       { width: tw, lineBreak: false });
}

function drawSquarePill(doc, text, x, y, width, height, bgColor, textColor, fontSize, radius = 8) {
  roundedRect(doc, x, y, width, height, radius);
  doc.fill(bgColor);
  doc.fillColor(textColor)
     .font("Helvetica-Bold")
     .fontSize(fontSize)
     .text(text, x, y + (height - fontSize) / 2 + 1,
       { width: width, align: "center", lineBreak: false });
}

function drawHeader(doc) {
  const H = C.HEADER;
  const dp = C.DATE_PILLS;

  // Cream background
  doc.rect(0, H.y, C.PAGE.width, H.height).fill(H.bgColor);

  // ── RailTrans Logo (left column) ──────────────────────────────────────────
  safeImage(doc, C.RAILTRANS_LOGO.path, C.RAILTRANS_LOGO.x, C.RAILTRANS_LOGO.y, C.RAILTRANS_LOGO.width);

  // ── Right column: Edition pill, Date squares, JULY 2026, venue, Mandapam ─

  // "6th EDITION" pill — top of right column
  const ep = C.EDITION_PILL;
  drawPill(doc, ep.text, ep.x, ep.y, ep.bgColor, ep.textColor, ep.fontSize, 18, 18);

  // Date square pills "03" and "04"
  drawSquarePill(doc, dp.pill1.text, dp.pill1.x, dp.pill1.y, dp.pill1.width, dp.pill1.height,
                 dp.pill1.bgColor, dp.pill1.textColor, dp.pill1.fontSize, 6);
  drawSquarePill(doc, dp.pill2.text, dp.pill2.x, dp.pill2.y, dp.pill2.width, dp.pill2.height,
                 dp.pill2.bgColor, dp.pill2.textColor, dp.pill2.fontSize, 6);

  // "JULY 2026" — large bold text, to the RIGHT of the date squares
  // Reference: date squares on left of centre-right, JULY 2026 beside them
  doc.fillColor("#000000")
     .font("Helvetica-Bold")
     .fontSize(22)
     .text("JULY 2026", dp.monthX, dp.monthY, { lineBreak: false });

  // Venue text — smaller, below JULY 2026
  doc.fillColor("#444444")
     .font("Helvetica")
     .fontSize(7)
     .text("BHARAT MANDAPAM, NEW DELHI, INDIA", dp.monthX, dp.venueY, { lineBreak: false });

  // Bharat Mandapam logo — top-right corner
  safeImage(doc, C.MANDAPAM.path, C.MANDAPAM.x, C.MANDAPAM.y, C.MANDAPAM.width);
}

function drawTagline(doc) {
  const tg = C.TAGLINE;
  doc.rect(0, tg.y, C.PAGE.width, tg.height).fill(tg.bgColor);

  doc.font("Helvetica-Bold").fontSize(tg.fontSize);
  const tw = doc.widthOfString(tg.text);
  const pw = tw + 40;
  const ph = 20;
  const px = (C.PAGE.width - pw) / 2;
  const py = tg.y + (tg.height - ph) / 2;

  roundedRect(doc, px, py, pw, ph, 10);
  doc.fillAndStroke(tg.pillBgColor, tg.pillBorderColor);

  doc.fillColor(tg.textColor)
     .font("Helvetica-Bold")
     .fontSize(tg.fontSize)
     .text(tg.text, px + 10, py + (ph - tg.fontSize) / 2 + 1,
       { width: pw - 20, align: "center", lineBreak: false });
}

function drawBodyBackground(doc) {
  const bodyH = C.BODY.endY - C.BODY.startY;
  doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH).fill(C.BODY.bgColor);

  safeImage(doc, C.BODY.bgImage, 0, C.BODY.startY, C.PAGE.width, { height: bodyH });

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
    qc.x + (qc.width - C.QR.size) / 2,
    qc.y + (qc.height - C.QR.size) / 2,
    { width: C.QR.size });
}

function drawNameAndCompany(doc, name, company) {
  if (name) {
    doc.fillColor("#000000")
       .font("Helvetica-Bold")
       .fontSize(C.TEXT_AREA.nameFontSize)
       .text(name, 0, C.TEXT_AREA.nameY,
         { align: "center", width: C.PAGE.width });
  }

  if (company) {
    doc.fillColor("#555555")
       .font("Helvetica")
       .fontSize(C.TEXT_AREA.companyFontSize)
       .text(company, 0, C.TEXT_AREA.companyY,
         { align: "center", width: C.PAGE.width });
  }
}

function drawFooter(doc) {
  const org = C.ORGANISED_BY;
  drawPill(doc, org.label, org.labelX, org.labelY,
           org.labelBgColor, org.labelTextColor, org.labelFontSize, 16, 15);
  safeImage(doc, org.logoPath, org.logoX, org.logoY, org.logoWidth);

  const assoc = C.ASSOCIATION;
  drawPill(doc, assoc.label, assoc.labelX, assoc.labelY,
           assoc.labelBgColor, assoc.labelTextColor, assoc.labelFontSize, 18, 15);
  safeImage(doc, assoc.logo1Path, assoc.logo1X, assoc.logo1Y, assoc.logo1Width);
  safeImage(doc, assoc.logo2Path, assoc.logo2X, assoc.logo2Y, assoc.logo2Width);
}

function drawRibbon(doc, themeColor, ribbonLabel) {
  const R = C.RIBBON;

  roundedRect(doc, 0, R.y, C.PAGE.width, R.height, R.borderRadius);
  doc.fill(themeColor);

  const ribbonTextY = R.y + (R.height / 2) - (R.textSize / 2) - 2;

  // Shadow
  doc.fillColor("#000000")
     .opacity(0.2)
     .font(R.font)
     .fontSize(R.textSize)
     .text(ribbonLabel, 1, ribbonTextY + 1,
       { align: "center", width: C.PAGE.width });

  // Main text
  doc.fillColor(R.textColor)
     .opacity(1)
     .font(R.font)
     .fontSize(R.textSize)
     .text(ribbonLabel, 0, ribbonTextY,
       { align: "center", width: C.PAGE.width });
}

// ── Main Generator Function ───────────────────────────────────────────────────

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

      // Draw layers in order
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height).fill(themeColor);
      drawHeader(doc);
      drawTagline(doc);
      drawBodyBackground(doc);
      await drawQRCard(doc, ticketCode, entity, mode);

      let name = (data.name || data.full_name ||
        (data.firstName ? `${data.firstName} ${data.lastName || ""}` : "")).trim().toUpperCase();
      let company = (data.company || data.organization || data.companyName || "").trim();

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