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
        // Silent fail
      }
    }
  }
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

function drawLabelPill(doc, text, x, y, bgColor, textColor) {
  const fontSize = 6;
  doc.font("Helvetica-Bold").fontSize(fontSize);
  const tw = doc.widthOfString(text);
  const pw = tw + 14;
  const ph = 14;
  roundedRect(doc, x, y, pw, ph, 4);
  doc.fill(bgColor);
  doc.fillColor(textColor)
     .font("Helvetica-Bold")
     .fontSize(fontSize)
     .text(text, x + 7, y + 4, { width: tw, lineBreak: false });
}

function drawHeader(doc) {
  const H = C.HEADER;
  const HT = C.HEADER_TEXT;

  // Cream background
  doc.rect(0, H.y, C.PAGE.width, H.height).fill(H.bgColor);

  // Left branding
  doc.fillColor("#333333").font("Helvetica-Oblique").fontSize(8)
     .text("6", HT.leftX, HT.superscriptY, { continued: true })
     .font("Helvetica-Oblique").fontSize(6)
     .text("th", { continued: false });

  doc.fillColor("#444444").font("Helvetica-Oblique").fontSize(10)
     .text("─── 2026 ───", HT.leftX + 22, HT.lineY - 1);

  // Red chevron
  const ax = HT.leftX;
  const ay = HT.railtransY + 2;
  doc.save()
     .moveTo(ax, ay + 14)
     .lineTo(ax + 14, ay)
     .lineTo(ax + 14, ay + 28)
     .closePath()
     .fill("#C8102E");
  doc.restore();

  doc.rect(ax, ay + 12, 14, 4).fill("#C8102E");

  // RailTrans text
  const rtX = ax + 18;
  const rtY = HT.railtransY;
  doc.fillColor("#C8102E").font("Helvetica-BoldOblique").fontSize(28)
     .text("Rail", rtX, rtY, { continued: true, lineBreak: false });
  doc.fillColor("#1B3A8A").font("Helvetica-Bold").fontSize(28)
     .text("Trans", { continued: false, lineBreak: false });

  doc.fillColor("#1B3A8A").font("Helvetica-Bold").fontSize(8)
     .text("RAIL & TRANSIT EXPO", ax, HT.expoLineY);

  // Right date block
  doc.rect(HT.dateBoxX1, HT.dateBoxY, HT.dateBoxW, HT.dateBoxH).fill("#1B3A8A");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20)
     .text("03", HT.dateBoxX1, HT.dateBoxY + 8,
       { width: HT.dateBoxW, align: "center", lineBreak: false });

  doc.rect(HT.dateBoxX2, HT.dateBoxY, HT.dateBoxW, HT.dateBoxH).fill("#1B3A8A");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20)
     .text("04", HT.dateBoxX2, HT.dateBoxY + 8,
       { width: HT.dateBoxW, align: "center", lineBreak: false });

  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(18)
     .text("JULY 2026", HT.dateBoxX1, HT.monthY);

  doc.fillColor("#555555").font("Helvetica").fontSize(6)
     .text("BHARAT MANDAPAM, NEW DELHI, INDIA", HT.dateBoxX1, HT.venueY);

  safeImage(doc, C.MANDAPAM.path, C.MANDAPAM.x, C.MANDAPAM.y, C.MANDAPAM.width);
}

function drawTagline(doc) {
  const tg = C.TAGLINE;
  doc.rect(0, tg.y, C.PAGE.width, tg.height).fill(tg.bgColor);
  
  doc.font("Helvetica-Bold").fontSize(tg.fontSize);
  const tw = doc.widthOfString(tg.text);
  const pw = Math.min(tw + 28, C.PAGE.width - 16);
  const ph = tg.height - 8;
  const px = (C.PAGE.width - pw) / 2;
  const py = tg.y + 4;

  roundedRect(doc, px, py, pw, ph, ph / 2);
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
    doc.fillColor("#333333")
       .font("Helvetica")
       .fontSize(C.TEXT_AREA.companyFontSize)
       .text(company, 0, C.TEXT_AREA.companyY,
         { align: "center", width: C.PAGE.width });
  }
}

function drawFooter(doc) {
  const org = C.ORGANISED_BY;
  drawLabelPill(doc, org.label, org.labelX, org.labelY, org.labelBgColor, org.labelTextColor);
  safeImage(doc, org.logoPath, org.logoX, org.logoY, org.logoWidth);

  const assoc = C.ASSOCIATION;
  drawLabelPill(doc, assoc.label, assoc.labelX, assoc.labelY, assoc.labelBgColor, assoc.labelTextColor);
  safeImage(doc, assoc.logo1Path, assoc.logo1X, assoc.logo1Y, assoc.logo1Width);
  safeImage(doc, assoc.logo2Path, assoc.logo2X, assoc.logo2Y, assoc.logo2Width);
}

function drawRibbon(doc, themeColor, ribbonLabel) {
  doc.rect(0, C.RIBBON.y, C.PAGE.width, C.RIBBON.height).fill(themeColor);
  
  const ribbonTextY = C.RIBBON.y + (C.RIBBON.height - C.RIBBON.textSize) / 2 - 2;
  doc.fillColor(C.RIBBON.textColor)
     .font(C.RIBBON.font)
     .fontSize(C.RIBBON.textSize)
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
      
      // Format name and company
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