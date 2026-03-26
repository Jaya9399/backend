// badgeGenerator.js — RailTrans Expo 2026
"use strict";

const fs = require("fs");
const path = require("path");
const PDF = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const C = require("./badgeConfig");

// ── Helper Functions ─────────────────────────────────────────────────────────

function safeImage(doc, filePath, x, y, width) {
  if (!filePath) return false;
  
  const possiblePaths = [
    filePath,
    path.join(process.cwd(), filePath),
    path.join(__dirname, "..", "assets", "logos", path.basename(filePath)),
    path.join(process.cwd(), "assets", "logos", path.basename(filePath)),
    path.join(__dirname, "..", "..", "assets", "logos", path.basename(filePath))
  ];
  
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      try {
        doc.image(tryPath, x, y, { width });
        console.log(`✓ Loaded: ${path.basename(tryPath)}`);
        return true;
      } catch (err) {
        // Continue trying
      }
    }
  }
  
  console.warn(`✗ Missing: ${path.basename(filePath)}`);
  return false;
}

function roundedRect(doc, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  doc
    .moveTo(x + r, y)
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

// ── Main Generator ───────────────────────────────────────────────────────────

async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { mode = "email" } = options;
      
      const ticketCode = data?.ticket_code || data?.ticketCode || data?.data?.ticket_code;
      if (!ticketCode) throw new Error("ticket_code missing");
      
      const isPaid = Boolean(data.txId) || data.paid === true || Number(data.amount || 0) > 0;
      const { ribbon: ribbonLabel, color: themeColor } = getBadgeTheme({ entity, isPaid });
      
      console.log(`Generating ${ribbonLabel} badge for ${data.name || 'Attendee'}`);
      
      const doc = new PDF({ size: [C.PAGE.width, C.PAGE.height], margin: 0 });
      const buffers = [];
      doc.on("data", chunk => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      
      // ═══════════════════════════════════════════════════════════════
      // 1. TOP COLOR STRIP
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height).fill(themeColor);
      
      // ═══════════════════════════════════════════════════════════════
      // 2. HEADER with Logos and Date Boxes
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.HEADER.y, C.PAGE.width, C.HEADER.height).fill(C.HEADER.bgColor);
      
      // RailTrans Logo
      safeImage(doc, C.LOGO_RAILTRANS.path, C.LOGO_RAILTRANS.x, C.LOGO_RAILTRANS.y, C.LOGO_RAILTRANS.width);
      
      // Bharat Mandapam Logo
      safeImage(doc, C.MANDAPAM.path, C.MANDAPAM.x, C.MANDAPAM.y, C.MANDAPAM.width);
      
      // Date Box 03
      const db03 = C.DATE_BOX_03;
      doc.rect(db03.x, db03.y, db03.w, db03.h).fill(db03.bgColor);
      doc.fillColor(db03.textColor)
         .font("Helvetica-Bold")
         .fontSize(db03.fontSize)
         .text(db03.text, db03.x, db03.y + 12, { width: db03.w, align: "center" });
      
      // Date Box 04
      const db04 = C.DATE_BOX_04;
      doc.rect(db04.x, db04.y, db04.w, db04.h).fill(db04.bgColor);
      doc.fillColor(db04.textColor)
         .font("Helvetica-Bold")
         .fontSize(db04.fontSize)
         .text(db04.text, db04.x, db04.y + 12, { width: db04.w, align: "center" });
      
      // July 2026
      const my = C.MONTH_YEAR;
      doc.fillColor(my.color)
         .font(my.font)
         .fontSize(my.fontSize)
         .text(my.text, my.x, my.y);
      
      // Venue
      const venue = C.VENUE;
      doc.fillColor(venue.color)
         .font(venue.font)
         .fontSize(venue.fontSize)
         .text(venue.text, venue.x, venue.y);
      
      // ═══════════════════════════════════════════════════════════════
      // 3. TAGLINE PILL
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.TAGLINE.y, C.PAGE.width, C.TAGLINE.height).fill(C.TAGLINE.bgColor);
      
      const tagline = C.TAGLINE;
      doc.font("Helvetica-Bold").fontSize(tagline.fontSize);
      const textWidth = doc.widthOfString(tagline.text);
      const pillWidth = Math.min(textWidth + 30, C.PAGE.width - 40);
      const pillX = (C.PAGE.width - pillWidth) / 2;
      const pillY = tagline.y + (tagline.height - 22) / 2;
      
      roundedRect(doc, pillX, pillY, pillWidth, 22, 11);
      doc.fill(tagline.pillColor);
      
      doc.fillColor(tagline.textColor)
         .font("Helvetica-Bold")
         .fontSize(tagline.fontSize)
         .text(tagline.text, pillX + 15, pillY + 6, { 
           width: pillWidth - 30, 
           align: "center",
           lineBreak: false 
         });
      
      // ═══════════════════════════════════════════════════════════════
      // 4. BODY with QR Card
      // ═══════════════════════════════════════════════════════════════
      const bodyStartY = C.BODY.startY;
      const bodyEndY = C.FOOTER.y;
      doc.rect(0, bodyStartY, C.PAGE.width, bodyEndY - bodyStartY).fill(C.BODY.bgColor);
      
      // QR Card
      const qc = C.QR_CARD;
      roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.fill(qc.bgColor);
      
      doc.strokeColor(qc.borderColor).lineWidth(qc.borderWidth);
      roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.stroke();
      
      // QR Code
      const qrPayload = mode === "scan" ? ticketCode : JSON.stringify({ ticket_code: ticketCode, entity });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: C.QR.size * 3,
      });
      const qrBuf = Buffer.from(qrDataUrl.split(",")[1], "base64");
      const qrX = qc.x + (qc.width - C.QR.size) / 2;
      const qrY = qc.y + (qc.height - C.QR.size) / 2;
      doc.image(qrBuf, qrX, qrY, { width: C.QR.size });
      
      // ═══════════════════════════════════════════════════════════════
      // 5. NAME and COMPANY (NO TICKET CODE)
      // ═══════════════════════════════════════════════════════════════
      const name = (data.name || data.full_name || 
        (data.firstName ? `${data.firstName} ${data.lastName || ''}` : '')).trim().toUpperCase();
      const company = data.company || data.organization || data.companyName || "";
      
      if (name) {
        doc.fillColor("#000000")
           .font("Helvetica-Bold")
           .fontSize(C.TEXT_AREA.nameFontSize)
           .text(name, 0, C.TEXT_AREA.nameY, { align: "center", width: C.PAGE.width });
      }
      
      if (company) {
        doc.fillColor("#666666")
           .font("Helvetica")
           .fontSize(C.TEXT_AREA.companyFontSize)
           .text(company, 0, C.TEXT_AREA.companyY, { align: "center", width: C.PAGE.width });
      }
      
      // ═══════════════════════════════════════════════════════════════
      // 6. FOOTER with Logos
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.FOOTER.y, C.PAGE.width, C.FOOTER.height).fill(C.FOOTER.bgColor);
      
      doc.strokeColor(C.FOOTER.borderTopColor).lineWidth(1)
         .moveTo(0, C.FOOTER.y)
         .lineTo(C.PAGE.width, C.FOOTER.y)
         .stroke();
      
      // Organised By section
      const org = C.ORGANISED_BY;
      doc.fillColor("#666666")
         .font("Helvetica-Bold")
         .fontSize(7)
         .text(org.label, org.labelX, org.labelY);
      safeImage(doc, org.logoPath, org.logoX, org.logoY, org.logoWidth);
      
      // In Association With section
      const assoc = C.ASSOCIATION;
      doc.fillColor("#666666")
         .font("Helvetica-Bold")
         .fontSize(7)
         .text(assoc.label, assoc.labelX, assoc.labelY);
      safeImage(doc, assoc.logo1Path, assoc.logo1X, assoc.logo1Y, assoc.logo1Width);
      safeImage(doc, assoc.logo2Path, assoc.logo2X, assoc.logo2Y, assoc.logo2Width);
      
      // ═══════════════════════════════════════════════════════════════
      // 7. RIBBON with Role (VISITOR/DELEGATE/EXHIBITOR etc.)
      // ═══════════════════════════════════════════════════════════════
      doc.rect(0, C.RIBBON.y, C.PAGE.width, C.RIBBON.height).fill(themeColor);
      
      const ribbonTextY = C.RIBBON.y + ((C.RIBBON.height - C.RIBBON.textSize) / 2) + 4;
      doc.fillColor(C.RIBBON.textColor)
         .font(C.RIBBON.font)
         .fontSize(C.RIBBON.textSize)
         .text(ribbonLabel, 0, ribbonTextY, { align: "center", width: C.PAGE.width });
      
      doc.end();
      
    } catch (err) {
      console.error("Badge generation error:", err);
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };