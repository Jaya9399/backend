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
    path.join(__dirname, "..", "assets", "bg", path.basename(filePath)),
    path.join(__dirname, "assets", "logos", path.basename(filePath)),
    path.join(__dirname, "assets", "bg", path.basename(filePath)),
    path.join(process.cwd(), "public", "assets", "logos", path.basename(filePath)),
    "C:\\Users\\Jaya Singh\\Demo\\backend\\assets\\logos\\" + path.basename(filePath),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try { doc.image(p, x, y, { width, ...extraOpts }); return true; } catch (_) { }
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
  const pw = tw + (padding * 2);
  roundedRect(doc, x, y, pw, height, height / 2);
  doc.fill(bgColor);
  doc.fillColor(textColor).font("Helvetica-Bold").fontSize(fontSize)
    .text(text, x, y + (height - fontSize) / 2 + 1, {
      width: pw,
      align: "center",
      lineBreak: false,
      ellipsis: false
    });
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
  const H = C.HEADER;
  const dp = C.DATE_PILLS;
  const ep = C.EDITION_PILL;

  doc.rect(0, H.y, C.PAGE.width, H.height).fill(H.bgColor);

  // RailTrans logo — left
  safeImage(doc, C.RAILTRANS_LOGO.path, C.RAILTRANS_LOGO.x, C.RAILTRANS_LOGO.y, C.RAILTRANS_LOGO.width);

  // Optional "EDITION" pill (may be removed in config)
  if (ep && typeof ep.text === "string" && ep.text.trim() !== "") {
    drawPill(doc, ep.text, ep.x, ep.y, ep.bgColor, ep.textColor, ep.fontSize, 16, 18);
  }

  // Date squares "03" "04"
  if (dp?.pill1?.text) {
    drawSquarePill(
      doc,
      dp.pill1.text,
      dp.pill1.x,
      dp.pill1.y,
      dp.pill1.width,
      dp.pill1.height,
      dp.pill1.bgColor,
      dp.pill1.textColor,
      dp.pill1.fontSize
    );
  }
  if (dp?.pill2?.text) {
    drawSquarePill(
      doc,
      dp.pill2.text,
      dp.pill2.x,
      dp.pill2.y,
      dp.pill2.width,
      dp.pill2.height,
      dp.pill2.bgColor,
      dp.pill2.textColor,
      dp.pill2.fontSize
    );
  }

  // "JULY" then "2026" — to right of date squares (no overlap with Mandapam)
  const mandapamLeftEdge = Number(C?.MANDAPAM?.x);
  const rightLimit = Number.isFinite(mandapamLeftEdge) ? mandapamLeftEdge - 10 : C.PAGE.width - 8;
  const monthMaxWidth = Math.max(40, rightLimit - (dp?.monthX ?? 0));
  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(20)
    .text("JULY", dp?.monthX ?? 0, dp?.monthY ?? 0,
      { width: monthMaxWidth, lineBreak: false });

  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(20)
    .text("2026", dp?.monthX ?? 0, (dp?.monthY ?? 0) + 20,
      { width: monthMaxWidth, lineBreak: false });

  // Bharat Mandapam logo — top-right
  safeImage(doc, C.MANDAPAM.path, C.MANDAPAM.x, C.MANDAPAM.y, C.MANDAPAM.width);

  // Venue — bigger + less gap under Mandapam logo (2 lines)
  const mt = C.MANDAPAM_TEXT || {};
  const venueX = Number(C?.MANDAPAM?.x) || (dp?.monthX ?? 0);
  const venueW = Number(C?.MANDAPAM?.width) || Math.max(40, rightLimit - (dp?.monthX ?? 0));

  const logoBottomY = Number(C?.MANDAPAM?.y ?? 0) + Number(C?.MANDAPAM?.width ?? 0) * 0.40;
  const baseY =
    Number.isFinite(logoBottomY) && logoBottomY > 0
      ? logoBottomY + (Number(mt.gapFromLogo) || 4)
      : (dp?.venueY ?? 0);

  doc.fillColor(mt.color || "#555555").font("Helvetica-Bold").fontSize(mt.fontSizeLine1 || 8.5)
    .text(mt.line1 || "BHARAT MANDAPAM", venueX, baseY, { width: venueW, align: "center", lineBreak: false });

  const line1H = doc.currentLineHeight();
  doc.fillColor(mt.color || "#555555").font("Helvetica").fontSize(mt.fontSizeLine2 || 6.7)
    .text(mt.line2 || "NEW DELHI, INDIA", venueX, baseY + line1H + (Number(mt.lineGap) || 1.5), {
      width: venueW,
      align: "center",
      lineBreak: false,
    });
}

function drawTagline(doc) {
  const tg = C.TAGLINE;
  doc.rect(0, tg.y, C.PAGE.width, tg.height).fill(tg.bgColor);

  doc.font("Helvetica-Bold").fontSize(tg.fontSize);
  const tw = doc.widthOfString(tg.text);
  const pw = Math.min(tw + 40, C.PAGE.width - 20);
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
  const bodyH = C.RIBBON.y - C.BODY.startY;
  doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH).fill(C.BODY.bgColor);
  safeImage(doc, C.BODY.bgImage, 0, C.BODY.startY, C.PAGE.width, { height: bodyH });

  // White overlay
  doc.save();
  doc.opacity(C.BODY.overlayOpacity / 255);
  doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH).fill("#FFFFFF");
  doc.restore();
}

async function drawQRCard(doc, ticketCode, entity, mode, name, company) {
  const qc = C.QR_CARD;
  
  // Draw card background
  roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
  doc.fill(qc.bgColor);
  doc.strokeColor(qc.borderColor).lineWidth(qc.borderWidth);
  roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
  doc.stroke();

  // Generate QR code with larger size
  const qrPayload = mode === "scan"
    ? ticketCode
    : JSON.stringify({ ticket_code: ticketCode, entity });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: C.QR.size * 4,
  });
  const qrBuf = Buffer.from(qrDataUrl.split(",")[1], "base64");
  
  const qrX = qc.x + (qc.width - C.QR.size) / 2;
  const qrY = qc.y + 20; // Adjusted for larger QR
  doc.image(qrBuf, qrX, qrY, { width: C.QR.size });

  // Calculate text starting position
  const textStartY = qrY + C.QR.size + (Number(C?.TEXT_AREA?.gapAfterQr) || 15);
  
  // Draw NAME - BOLDER AND BIGGER
  doc.fillColor("#000")
    .font("Helvetica-Bold")
    .fontSize(C.TEXT_AREA.nameFontSize);
  
  // Calculate name height
  const nameHeight = doc.heightOfString(name, {
    width: qc.width - 30,
    align: "center"
  });
  
  doc.text(name, qc.x + 15, textStartY, {
    width: qc.width - 30,
    align: "center"
  });

  // Draw COMPANY - BOLDER AND BIGGER
  if (company && company.trim() !== "" && company !== "UNDEFINED" && company !== "NULL") {
    doc.fillColor("#333") // Darker for better contrast
      .font("Helvetica-Bold") // Make company bold too
      .fontSize(C.TEXT_AREA.companyFontSize);
    
    // Position company below name with spacing
    const companyY = textStartY + nameHeight + 10;
    
    doc.text(company, qc.x + 15, companyY, {
      width: qc.width - 30,
      align: "center",
      lineBreak: true
    });
  }
}


function drawFooter(doc) {
  const org = C.ORGANISED_BY;
  drawPill(doc, org.label, org.labelX, org.labelY,
    org.labelBgColor, org.labelTextColor, org.labelFontSize, 16, 15);
  safeImage(doc, org.logoPath, org.logoX, org.logoY, org.logoWidth);

  const assoc = C.ASSOCIATION;

  // Settings
  const rightMargin = 20;
  const logoWidth = Number(assoc.logoWidth) || 34;
  const gap = 6;

  // Text width
  doc.font("Helvetica-Bold").fontSize(assoc.labelFontSize);
  const textWidth = doc.widthOfString(assoc.label);

  // Force bigger capsule width
  const pillWidth = doc.widthOfString(assoc.label) + (24 * 2);

  // Logos width
  const logosWidth = (logoWidth * 2) + gap;

  // Block width
  const blockWidth = Math.max(pillWidth, logosWidth);

  // Right align block
  const rightEdge = C.PAGE.width - rightMargin;
  const blockStartX = rightEdge - blockWidth;

  // Center elements
  const pillX = blockStartX + (blockWidth - pillWidth) / 2;
  const logosX = blockStartX + (blockWidth - logosWidth) / 2;

  // Draw capsule
  const pillY = assoc.labelY;

  drawPill(
    doc,
    assoc.label,
    pillX,
    pillY,
    assoc.labelBgColor,
    assoc.labelTextColor,
    assoc.labelFontSize,
    24,
    24
  );

  // Logos just below capsule (slightly closer + bigger)
  const logoY = pillY + (Number(assoc.logoGapFromLabel) || 10) + 24;

  safeImage(doc, assoc.logo1Path, logosX, logoY, logoWidth);
  safeImage(doc, assoc.logo2Path, logosX + logoWidth + gap, logoY, logoWidth);
}

function drawRibbon(doc, themeColor, ribbonLabel) {
  const R = C.RIBBON;


  doc.rect(0, R.y, C.PAGE.width, R.height).fill(themeColor);

  // then add rounded mask on top (optional smooth look)
  roundedRect(doc, 0, R.y, C.PAGE.width, R.height, R.borderRadius);
  doc.fill(themeColor);

  // Vertically center text within ribbon
  const textY = R.y + (R.height - R.textSize) / 2;

  // Main label
  doc.fillColor(R.textColor)
    .opacity(1)
    .font("Helvetica-Bold")  // Fixed: Use standard PDF font
    .fontSize(R.textSize)
    .text(ribbonLabel, 0, textY, { align: "center", width: C.PAGE.width });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { mode = "email" } = options;

      const ticketCode = data?.ticket_code || data?.ticketCode || data?.data?.ticket_code;
      if (!ticketCode) throw new Error("ticket_code missing");

      // Payment signals vary by collection/flow; treat any positive ticket amount as paid.
      const paidAmount =
        Number(data.amount) ||
        Number(data.amount_paid) ||
        Number(data.ticket_total) ||
        Number(data.ticket_price) ||
        Number(data.ticketTotal) ||
        Number(data.ticketPrice) ||
        Number(data?.data?.amount) ||
        Number(data?.data?.ticket_total) ||
        0;
      const isPaid =
        Boolean(data.txId || data.tx_id || data.transactionId || data.paymentId || data.razorpay_payment_id) ||
        data.paid === true ||
        String(data.payment_status || "").toLowerCase() === "paid" ||
        paidAmount > 0;
      const { ribbon: ribbonLabel, color: themeColor } = getBadgeTheme({ entity, isPaid });

      console.log(`[${ribbonLabel}] ${data.name || "(no name)"}`);

      const doc = new PDF({ size: [C.PAGE.width, C.PAGE.height], margin: 0 });
      const buffers = [];
      doc.on("data", b => buffers.push(b));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Draw all sections
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height).fill(themeColor);
      drawHeader(doc);
      drawTagline(doc);
      drawBodyBackground(doc);
      
      // Enhanced name extraction
      const name = (data.name || 
                   data.full_name ||
                   (data.firstName ? `${data.firstName} ${data.lastName || ""}` : "") ||
                   data.fullName ||
                   "").trim().toUpperCase();
      
      // Enhanced company extraction
      let company = (data.company ||
                    data.organization ||
                    data.companyName ||
                    data.company_name ||
                    data.org ||
                    data.employer ||
                    data.affiliation ||
                    data.business ||
                    data.firm ||
                    (data.data && data.data.company) ||
                    (data.data && data.data.organization) ||
                    (data.data && data.data.companyName) ||
                    "").trim().toUpperCase();
      
      // Remove any "null" or "undefined" strings
      if (company === "NULL" || company === "UNDEFINED" || company === "") {
        company = "";
      }
      
      console.log(`[DEBUG] Final Company: "${company}"`);
      
      await drawQRCard(doc, ticketCode, entity, mode, name, company);
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