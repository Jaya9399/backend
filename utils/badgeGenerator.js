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
    "C:\\Users\\Jaya Singh\\Demo\\backend\\assets\\logos\\" + path.basename(filePath),
  ];
  
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        doc.image(p, x, y, { width, ...extraOpts });
        return true;
      } catch (e) {
        // Silent fail
      }
    }
  }
  console.warn(`⚠️ Image not found: ${path.basename(filePath)}`);
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

function drawSquarePill(doc, text, x, y, width, height, bgColor, textColor, fontSize, radius = 8) {
  roundedRect(doc, x, y, width, height, radius);
  doc.fill(bgColor);
  doc.fillColor(textColor)
     .font("Helvetica-Bold")
     .fontSize(fontSize)
     .text(text, x, y + (height - fontSize) / 2 + 2,
       { width: width, align: "center", lineBreak: false });
}

function drawHeader(doc) {
  const H = C.HEADER;
  
  // White background
  doc.rect(0, H.y, C.PAGE.width, H.height).fill(H.bgColor);
  
  // Date Square Pills
  const dp = C.DATE_PILLS;
  drawSquarePill(doc, dp.pill1.text, dp.pill1.x, dp.pill1.y, dp.pill1.width, dp.pill1.height,
                 dp.pill1.bgColor, dp.pill1.textColor, dp.pill1.fontSize, 10);
  drawSquarePill(doc, dp.pill2.text, dp.pill2.x, dp.pill2.y, dp.pill2.width, dp.pill2.height,
                 dp.pill2.bgColor, dp.pill2.textColor, dp.pill2.fontSize, 10);
  
  // JULY 2026 text
  doc.fillColor("#000000")
     .font("Helvetica-Bold")
     .fontSize(18)
     .text("JULY 2026", (C.PAGE.width - 100) / 2, dp.monthY, { align: "center", width: 100 });
}

function drawTagline(doc) {
  const tg = C.TAGLINE;
  
  doc.fillColor(tg.textColor)
     .font("Helvetica")
     .fontSize(tg.fontSize)
     .text(tg.text, 20, tg.y, 
       { align: "center", width: C.PAGE.width - 40, lineBreak: true });
}

function drawBodyBackground(doc) {
  const bodyH = C.BODY.endY - C.BODY.startY;
  doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH).fill(C.BODY.bgColor);
}

async function drawQRCard(doc, ticketCode, entity, mode) {
  const qc = C.QR_CARD;
  
  // Draw white background for QR
  roundedRect(doc, qc.x, qc.y, qc.width, qc.height, 8);
  doc.fill(qc.bgColor);
  doc.strokeColor(qc.borderColor).lineWidth(qc.borderWidth);
  roundedRect(doc, qc.x, qc.y, qc.width, qc.height, 8);
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

function drawMainTitle(doc) {
  const mt = C.MAIN_TITLE;
  
  doc.fillColor(mt.textColor)
     .font("Helvetica-Bold")
     .fontSize(mt.fontSize)
     .text(mt.text, 0, mt.y, 
       { align: "center", width: C.PAGE.width });
}

function drawOrganiser(doc) {
  const org = C.ORGANISER;
  
  // Draw "ORGANISED BY" text
  doc.fillColor(org.labelColor)
     .font("Helvetica")
     .fontSize(org.labelFontSize)
     .text(org.label, 0, org.labelY, 
       { align: "center", width: C.PAGE.width });
  
  // Draw Urban Infra Group logo
  safeImage(doc, org.logoPath, org.logoX, org.logoY, org.logoWidth);
}

function drawRibbon(doc, themeColor, ribbonLabel) {
  const R = C.RIBBON;
  
  // Draw full-width rectangle for ribbon
  doc.rect(0, R.y, C.PAGE.width, R.height).fill(themeColor);
  
  // Add text
  const ribbonTextY = R.y + (R.height - R.textSize) / 2;
  doc.fillColor(R.textColor)
     .font(R.font)
     .fontSize(R.textSize)
     .text(ribbonLabel, 0, ribbonTextY,
       { align: "center", width: C.PAGE.width });
}

// ── Main Generator Function ─────────────────────────────────────────────────

async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { mode = "email" } = options;

      // Get ticket code
      const ticketCode = data?.ticket_code || data?.ticketCode || data?.data?.ticket_code;
      if (!ticketCode) {
        throw new Error("ticket_code missing");
      }

      // Get payment status
      const isPaid = Boolean(data.txId) || data.paid === true || Number(data.amount) > 0;

      // Get theme from badgeTheme.js
      const { ribbon: ribbonLabel, color: themeColor } = getBadgeTheme({ entity, isPaid });

      console.log(`[${ribbonLabel}] ${data.name || "(no name)"}`);

      // Create PDF
      const doc = new PDF({ size: [C.PAGE.width, C.PAGE.height], margin: 0 });
      const buffers = [];
      doc.on("data", b => buffers.push(b));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Draw all sections
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height).fill(themeColor);
      drawHeader(doc);
      drawTagline(doc);
      drawBodyBackground(doc);
      await drawQRCard(doc, ticketCode, entity, mode);
      drawMainTitle(doc);
      drawOrganiser(doc);
      drawRibbon(doc, themeColor, ribbonLabel);

      doc.end();

    } catch (err) {
      console.error("Badge generation error:", err);
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };