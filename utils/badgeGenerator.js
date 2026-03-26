// badgeGenerator.js — RailTrans Expo 2026
"use strict";

const fs     = require("fs");
const PDF    = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const C      = require("./badgeConfig");

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeImg(doc, filePath, x, y, opts) {
  if (!filePath || !fs.existsSync(filePath)) {
    if (filePath) console.warn("[badge] missing asset:", filePath);
    return;
  }
  doc.image(filePath, x, y, opts);
}

// Rounded rectangle path (fill or stroke after calling)
function rrect(doc, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  doc.moveTo(x + r, y)
     .lineTo(x + w - r, y)
     .quadraticCurveTo(x + w, y,     x + w, y + r)
     .lineTo(x + w, y + h - r)
     .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
     .lineTo(x + r, y + h)
     .quadraticCurveTo(x,     y + h, x,     y + h - r)
     .lineTo(x, y + r)
     .quadraticCurveTo(x,     y,     x + r, y)
     .closePath();
}

// Vertical gradient via stacked thin rects
function vGradient(doc, x, y, w, h, hexTop, hexBottom) {
  const steps = 50;
  const parse = hex => {
    const n = parseInt(hex.replace("#",""), 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  };
  const [r1,g1,b1] = parse(hexTop);
  const [r2,g2,b2] = parse(hexBottom);
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    const hex = "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("");
    doc.rect(x, y + i * sh, w, sh + 0.5).fill(hex);
  }
}

// Draw pill label with rounded border (ORGANISED BY / IN ASSOCIATION WITH)
function pillLabel(doc, x, y, text, fontSize, borderColor, textColor, radius) {
  doc.save();
  doc.font("Helvetica-Bold").fontSize(fontSize);
  const tw = doc.widthOfString(text);
  const pw = tw + 18;
  const ph = fontSize + 7;
  doc.strokeColor(borderColor).lineWidth(0.7);
  rrect(doc, x, y, pw, ph, radius);
  doc.stroke();
  doc.fillColor(textColor).text(text, x + 9, y + 4, { lineBreak: false });
  doc.restore();
  return pw; // return pill width
}

// ── Allowed entities ─────────────────────────────────────────────────────────
const ALLOWED = ["visitors","exhibitors","partners","speakers","awardees"];

// ── Main ─────────────────────────────────────────────────────────────────────
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
      doc.on("end",  ()    => resolve(Buffer.concat(buffers)));

      // ═══════════════════════════════════════════════════════════
      // 1. TOP COLOR STRIP
      // ═══════════════════════════════════════════════════════════
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height)
         .fill(themeColor);

      // ═══════════════════════════════════════════════════════════
      // 2. CREAM HEADER
      // ═══════════════════════════════════════════════════════════
      doc.rect(0, C.HEADER.y, C.PAGE.width, C.HEADER.height)
         .fill(C.HEADER.bgColor);

      // bottom border
      doc.save()
         .strokeColor(C.HEADER.borderBottomColor).lineWidth(1)
         .moveTo(0, C.HEADER.y + C.HEADER.height)
         .lineTo(C.PAGE.width, C.HEADER.y + C.HEADER.height)
         .stroke().restore();

      // LEFT: RailTrans logo — vertically centered in header
      safeImg(doc, C.LOGO_RAILTRANS.path,
              C.LOGO_RAILTRANS.x, C.LOGO_RAILTRANS.y,
              { width: C.LOGO_RAILTRANS.width, height: C.LOGO_RAILTRANS.maxHeight });

      // Divider line
      doc.save()
         .strokeColor(C.HEADER_DIVIDER.color).lineWidth(C.HEADER_DIVIDER.lineWidth)
         .moveTo(C.HEADER_DIVIDER.x, C.HEADER_DIVIDER.y1)
         .lineTo(C.HEADER_DIVIDER.x, C.HEADER_DIVIDER.y2)
         .stroke().restore();

      // RIGHT: Date box 03
      const b03 = C.DATE_BOX.box03;
      doc.rect(b03.x, b03.y, C.DATE_BOX.w, C.DATE_BOX.h).fill(C.DATE_BOX.bgColor);
      doc.fillColor(C.DATE_BOX.textColor).font("Helvetica-Bold").fontSize(C.DATE_BOX.fontSize)
         .text("03", b03.x, b03.y + 10, { width: C.DATE_BOX.w, align: "center" });

      // Date box 04
      const b04 = C.DATE_BOX.box04;
      doc.rect(b04.x, b04.y, C.DATE_BOX.w, C.DATE_BOX.h).fill(C.DATE_BOX.bgColor);
      doc.fillColor(C.DATE_BOX.textColor).font("Helvetica-Bold").fontSize(C.DATE_BOX.fontSize)
         .text("04", b04.x, b04.y + 10, { width: C.DATE_BOX.w, align: "center" });

      // Bharat Mandapam image
      safeImg(doc, C.MANDAPAM.path, C.MANDAPAM.x, C.MANDAPAM.y,
              { width: C.MANDAPAM.width, height: C.MANDAPAM.maxHeight });

      // "JULY 2026"
      doc.fillColor(C.MONTH_TEXT.color).font(C.MONTH_TEXT.font).fontSize(C.MONTH_TEXT.size)
         .text(C.MONTH_TEXT.text, C.MONTH_TEXT.x, C.MONTH_TEXT.y,
               { width: C.MONTH_TEXT.width, align: C.MONTH_TEXT.align });

      // "BHARAT MANDAPAM, NEW DELHI, INDIA"
      doc.fillColor(C.VENUE_TEXT.color).font(C.VENUE_TEXT.font).fontSize(C.VENUE_TEXT.size)
         .text(C.VENUE_TEXT.text, C.VENUE_TEXT.x, C.VENUE_TEXT.y,
               { width: C.VENUE_TEXT.width, align: C.VENUE_TEXT.align });

      // ═══════════════════════════════════════════════════════════
      // 3. WHITE ROW + RED PILL TAGLINE
      // ═══════════════════════════════════════════════════════════
      doc.rect(0, C.TAGLINE_ROW.y, C.PAGE.width, C.TAGLINE_ROW.height)
         .fill(C.TAGLINE_ROW.bgColor);

      // Measure pill to center it
      doc.font(C.TAGLINE_PILL.font).fontSize(C.TAGLINE_PILL.fontSize);
      const pillTW = doc.widthOfString(C.TAGLINE_PILL.text);
      const pillW  = Math.min(pillTW + C.TAGLINE_PILL.padH * 2, C.PAGE.width - 24);
      const pillX  = (C.PAGE.width - pillW) / 2;
      const pillY  = C.TAGLINE_PILL.y;
      const pillH  = C.TAGLINE_PILL.height;

      doc.save();
      rrect(doc, pillX, pillY, pillW, pillH, C.TAGLINE_PILL.radius);
      doc.fill(C.TAGLINE_PILL.bgColor);
      doc.fillColor(C.TAGLINE_PILL.textColor).font(C.TAGLINE_PILL.font).fontSize(C.TAGLINE_PILL.fontSize)
         .text(C.TAGLINE_PILL.text,
               pillX + C.TAGLINE_PILL.padH, pillY + C.TAGLINE_PILL.padV,
               { width: pillW - C.TAGLINE_PILL.padH * 2, align: "center", lineBreak: false });
      doc.restore();

      // ═══════════════════════════════════════════════════════════
      // 4. BODY — light-blue gradient + trains bg + QR card
      // ═══════════════════════════════════════════════════════════
      vGradient(doc, 0, C.BODY.y, C.PAGE.width, C.BODY.height, C.BODY.bgTop, C.BODY.bgBottom);

      // Trains bg image fades in at bottom half of body
      if (fs.existsSync(C.BG_IMAGE.path)) {
        doc.save().opacity(C.BG_IMAGE.opacity);
        doc.image(C.BG_IMAGE.path, C.BG_IMAGE.x, C.BG_IMAGE.y,
                  { width: C.BG_IMAGE.width, height: C.BG_IMAGE.height });
        doc.restore();
      }

      // White rounded QR card
      const qc = C.QR_CARD;
      doc.save();
      rrect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.fillAndStroke(qc.bgColor, qc.borderColor);
      doc.restore();

      // Generate QR
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
      doc.image(qrBuf, C.QR.x, C.QR.y, { width: C.QR.size });

      // ═══════════════════════════════════════════════════════════
      // 5. NAME / COMPANY / TICKET CODE (between body and footer)
      //    Background continues the light blue from body
      // ═══════════════════════════════════════════════════════════
      const name    = (data.name || data.full_name || "UNKNOWN").toUpperCase();
      const company = data.company || data.organization || "";

      let textY = C.NAME_ZONE.y;

      doc.fillColor("#111827").font("Helvetica-Bold").fontSize(18)
         .text(name, 0, textY, { align: "center", width: C.PAGE.width });
      textY += 22;

      if (company) {
        doc.fillColor("#4B5563").font("Helvetica").fontSize(11)
           .text(company, 0, textY, { align: "center", width: C.PAGE.width });
        textY += 16;
      }

      doc.fillColor("#9CA3AF").font("Helvetica").fontSize(8)
         .text(ticketCode, 0, textY, { align: "center", width: C.PAGE.width });

      // ═══════════════════════════════════════════════════════════
      // 6. FOOTER LOGOS (white background strip)
      // ═══════════════════════════════════════════════════════════
      doc.rect(0, C.FOOTER_ZONE.y, C.PAGE.width, C.FOOTER_ZONE.height)
         .fill(C.FOOTER_ZONE.bgColor);

      // top border of footer
      doc.save()
         .strokeColor(C.FOOTER_ZONE.borderTopColor).lineWidth(0.8)
         .moveTo(0, C.FOOTER_ZONE.y)
         .lineTo(C.PAGE.width, C.FOOTER_ZONE.y)
         .stroke().restore();

      // Left: "ORGANISED BY" pill + Urban Infra logo
      pillLabel(doc,
        C.LABEL_ORG.x, C.LABEL_ORG.y,
        C.LABEL_ORG.text, C.LABEL_ORG.fontSize,
        C.LABEL_ORG.pillBorder, C.LABEL_ORG.textColor, C.LABEL_ORG.radius);

      safeImg(doc, C.LOGO_URBAN.path, C.LOGO_URBAN.x, C.LOGO_URBAN.y,
              { width: C.LOGO_URBAN.width, height: C.LOGO_URBAN.maxHeight });

      // Right: "IN ASSOCIATION WITH" pill + logos
      pillLabel(doc,
        C.LABEL_ASSOC.x, C.LABEL_ASSOC.y,
        C.LABEL_ASSOC.text, C.LABEL_ASSOC.fontSize,
        C.LABEL_ASSOC.pillBorder, C.LABEL_ASSOC.textColor, C.LABEL_ASSOC.radius);

      safeImg(doc, C.LOGO_CHAMBER.path, C.LOGO_CHAMBER.x, C.LOGO_CHAMBER.y,
              { width: C.LOGO_CHAMBER.width, height: C.LOGO_CHAMBER.maxHeight });

      safeImg(doc, C.LOGO_RAILWAY.path, C.LOGO_RAILWAY.x, C.LOGO_RAILWAY.y,
              { width: C.LOGO_RAILWAY.width, height: C.LOGO_RAILWAY.maxHeight });

      // ═══════════════════════════════════════════════════════════
      // 7. RIBBON (colored bar with role label)
      // ═══════════════════════════════════════════════════════════
      doc.rect(0, C.RIBBON.y, C.PAGE.width, C.RIBBON.height)
         .fill(themeColor);

      doc.fillColor(C.RIBBON.textColor)
         .font(C.RIBBON.font)
         .fontSize(C.RIBBON.textSize)
         .text(ribbonLabel, 0, C.RIBBON.y + (C.RIBBON.height - C.RIBBON.textSize) / 2 - 2,
               { align: "center", width: C.PAGE.width,
                 characterSpacing: C.RIBBON.letterSpacing });

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };