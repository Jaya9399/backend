// badgeGenerator.js — RailTrans Expo 2026
// Reproduces the badge design image exactly using PDFKit.
//
// Layout (top → bottom):
//   Dark red top strip
//   Cream header: RailTrans logo LEFT | date boxes + venue RIGHT
//   White row with centered red pill tagline
//   Light-blue body: white rounded QR card centered, trains image fading in at bottom
//   Footer: "ORGANISED BY" + Urban Infra LEFT | "IN ASSOCIATION WITH" + logos RIGHT
//   Colored ribbon: DELEGATE / VISITOR / EXHIBITOR etc.

"use strict";

const fs     = require("fs");
const PDF    = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const C      = require("./badgeConfig");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeImage(doc, filePath, x, y, opts) {
  if (!filePath || !fs.existsSync(filePath)) {
    if (filePath) console.warn("[badge] missing asset:", filePath);
    return;
  }
  doc.image(filePath, x, y, opts);
}

// Draw a filled rounded rectangle path
function roundedRect(doc, x, y, w, h, r) {
  doc.moveTo(x + r, y)
     .lineTo(x + w - r, y)
     .quadraticCurveTo(x + w, y,     x + w, y + r)
     .lineTo(x + w, y + h - r)
     .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
     .lineTo(x + r, y + h)
     .quadraticCurveTo(x, y + h,     x, y + h - r)
     .lineTo(x, y + r)
     .quadraticCurveTo(x, y,         x + r, y)
     .closePath();
}

// Draw a pill label with border (ORGANISED BY / IN ASSOCIATION WITH)
function pillLabel(doc, cfg) {
  doc.save();
  const textW = doc.widthOfString(cfg.text, { fontSize: cfg.fontSize });
  const pillW = textW + 16;
  const pillH = cfg.fontSize + 6;
  // border
  doc.strokeColor(cfg.pillBorder).lineWidth(0.6);
  roundedRect(doc, cfg.x, cfg.y, pillW, pillH, cfg.borderRadius);
  doc.stroke();
  // label text
  doc.fillColor(cfg.textColor)
     .font("Helvetica-Bold")
     .fontSize(cfg.fontSize)
     .text(cfg.text, cfg.x + 8, cfg.y + 4, { lineBreak: false });
  doc.restore();
}

// Simple vertical gradient approximation using stacked thin rects
function verticalGradient(doc, x, y, w, h, colorTop, colorBottom, steps) {
  steps = steps || 40;
  const parseHex = (hex) => {
    const n = parseInt(hex.replace("#",""), 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  };
  const [r1,g1,b1] = parseHex(colorTop);
  const [r2,g2,b2] = parseHex(colorBottom);
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

// ─── Allowed entities ─────────────────────────────────────────────────────────
const ALLOWED = ["visitors","exhibitors","partners","speakers","awardees"];

// ─── Main ─────────────────────────────────────────────────────────────────────
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
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end",  () => resolve(Buffer.concat(buffers)));

      // ══════════════════════════════════════════════════════════════
      // 1. TOP DARK RED STRIP
      // ══════════════════════════════════════════════════════════════
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height)
         .fill(themeColor);

      // ══════════════════════════════════════════════════════════════
      // 2. CREAM HEADER
      // ══════════════════════════════════════════════════════════════
      doc.rect(0, C.HEADER.y, C.PAGE.width, C.HEADER.height)
         .fill(C.HEADER.bgColor);

      // bottom border of header
      doc.save()
         .strokeColor(C.HEADER.borderBottomColor)
         .lineWidth(C.HEADER.borderBottomWidth)
         .moveTo(0, C.HEADER.y + C.HEADER.height)
         .lineTo(C.PAGE.width, C.HEADER.y + C.HEADER.height)
         .stroke()
         .restore();

      // RailTrans logo — left half
      safeImage(doc, C.LOGO_RAILTRANS.path, C.LOGO_RAILTRANS.x, C.LOGO_RAILTRANS.y, {
        width: C.LOGO_RAILTRANS.width, fit: [175, 130],
      });

      // Subtle vertical divider
      doc.save()
         .strokeColor(C.HEADER_DIVIDER.color)
         .lineWidth(C.HEADER_DIVIDER.width)
         .moveTo(C.HEADER_DIVIDER.x, C.HEADER_DIVIDER.y1)
         .lineTo(C.HEADER_DIVIDER.x, C.HEADER_DIVIDER.y2)
         .stroke()
         .restore();

      // Date box "03"
      const b03 = C.DATE_BOX.box03;
      doc.rect(b03.x, b03.y, C.DATE_BOX.w, C.DATE_BOX.h).fill(C.DATE_BOX.bgColor);
      doc.fillColor(C.DATE_BOX.textColor)
         .font("Helvetica-Bold").fontSize(C.DATE_BOX.fontSize)
         .text("03", b03.x, b03.y + 9, { width: C.DATE_BOX.w, align: "center" });

      // Date box "04"
      const b04 = C.DATE_BOX.box04;
      doc.rect(b04.x, b04.y, C.DATE_BOX.w, C.DATE_BOX.h).fill(C.DATE_BOX.bgColor);
      doc.fillColor(C.DATE_BOX.textColor)
         .font("Helvetica-Bold").fontSize(C.DATE_BOX.fontSize)
         .text("04", b04.x, b04.y + 9, { width: C.DATE_BOX.w, align: "center" });

      // Bharat Mandapam image — right of date boxes
      safeImage(doc, C.MANDAPAM.path, C.MANDAPAM.x, C.MANDAPAM.y, {
        width: C.MANDAPAM.width, fit: [100, 44],
      });

      // "JULY 2026"
      doc.fillColor(C.MONTH_TEXT.color)
         .font(C.MONTH_TEXT.font).fontSize(C.MONTH_TEXT.size)
         .text(C.MONTH_TEXT.text, C.MONTH_TEXT.x, C.MONTH_TEXT.y, {
           width: C.MONTH_TEXT.width, align: "left",
         });

      // "BHARAT MANDAPAM, NEW DELHI, INDIA"
      doc.fillColor(C.VENUE_TEXT.color)
         .font(C.VENUE_TEXT.font).fontSize(C.VENUE_TEXT.size)
         .text(C.VENUE_TEXT.text, C.VENUE_TEXT.x, C.VENUE_TEXT.y, {
           width: C.VENUE_TEXT.width, align: "left",
         });

      // ══════════════════════════════════════════════════════════════
      // 3. WHITE ROW + RED PILL TAGLINE
      // ══════════════════════════════════════════════════════════════
      doc.rect(0, C.TAGLINE_ROW.y, C.PAGE.width, C.TAGLINE_ROW.height)
         .fill(C.TAGLINE_ROW.bgColor);

      // Measure pill width to center it
      doc.font(C.TAGLINE_PILL.font).fontSize(C.TAGLINE_PILL.fontSize);
      const pillTextW = doc.widthOfString(C.TAGLINE_PILL.text);
      const pillW = Math.min(pillTextW + C.TAGLINE_PILL.paddingH * 2, C.PAGE.width - 20);
      const pillX = (C.PAGE.width - pillW) / 2;

      doc.save();
      roundedRect(doc, pillX, C.TAGLINE_PILL.y, pillW, C.TAGLINE_PILL.height, C.TAGLINE_PILL.borderRadius);
      doc.fill(C.TAGLINE_PILL.bgColor);

      doc.fillColor(C.TAGLINE_PILL.textColor)
         .font(C.TAGLINE_PILL.font).fontSize(C.TAGLINE_PILL.fontSize)
         .text(C.TAGLINE_PILL.text,
               pillX + C.TAGLINE_PILL.paddingH,
               C.TAGLINE_PILL.y + C.TAGLINE_PILL.paddingV,
               { width: pillW - C.TAGLINE_PILL.paddingH * 2, align: "center", lineBreak: false });
      doc.restore();

      // ══════════════════════════════════════════════════════════════
      // 4. BODY — light blue gradient background
      // ══════════════════════════════════════════════════════════════
      verticalGradient(
        doc, 0, C.BODY.y, C.PAGE.width, C.BODY.height,
        C.BODY.bgColorTop, C.BODY.bgColorBottom
      );

      // Trains background image — fades in from bottom of body zone
      if (fs.existsSync(C.BG_IMAGE.path)) {
        doc.save().opacity(C.BG_IMAGE.opacity);
        doc.image(C.BG_IMAGE.path, C.BG_IMAGE.x, C.BG_IMAGE.y, {
          width: C.BG_IMAGE.width,
          height: C.BG_IMAGE.height,
        });
        doc.restore();
      }

      // White rounded QR card
      doc.save();
      roundedRect(doc, C.QR_CARD.x, C.QR_CARD.y, C.QR_CARD.width, C.QR_CARD.height, C.QR_CARD.borderRadius);
      doc.fillAndStroke(C.QR_CARD.bgColor, C.QR_CARD.borderColor);
      doc.restore();

      // QR code — centered inside card
      const qrPayload = mode === "scan"
        ? ticketCode
        : JSON.stringify({ ticket_code: ticketCode, entity });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: C.QR.size * 3,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
      const qrX = C.QR_CARD.x + (C.QR_CARD.width - C.QR.size) / 2;
      const qrY = C.QR_CARD.y + (C.QR_CARD.height - C.QR.size) / 2;
      doc.image(qrBuffer, qrX, qrY, { width: C.QR.size });

      // ══════════════════════════════════════════════════════════════
      // 5. FOOTER — same light-blue bg continues (already drawn above)
      //    Name / Company / Ticket code appear just ABOVE footer logos
      // ══════════════════════════════════════════════════════════════

      // Name
      const name    = (data.name || data.full_name || "UNKNOWN").toUpperCase();
      const company = data.company || data.organization || "";

      // Name sits just below the QR card
      const nameY = C.QR_CARD.y + C.QR_CARD.height + 10;
      doc.fillColor("#111827")
         .font("Helvetica-Bold").fontSize(17)
         .text(name, 0, nameY, { align: "center", width: C.PAGE.width });

      if (company) {
        doc.fillColor("#4B5563")
           .font("Helvetica").fontSize(10)
           .text(company, 0, nameY + 22, { align: "center", width: C.PAGE.width });
      }

      doc.fillColor("#9CA3AF")
         .font("Helvetica").fontSize(8)
         .text(ticketCode, 0, nameY + (company ? 38 : 24), {
           align: "center", width: C.PAGE.width,
         });

      // Pill labels + logos
      pillLabel(doc, C.LABEL_ORG);
      safeImage(doc, C.LOGO_URBAN.path, C.LOGO_URBAN.x, C.LOGO_URBAN.y, {
        width: C.LOGO_URBAN.width, fit: [110, 46],
      });

      pillLabel(doc, C.LABEL_ASSOC);
      safeImage(doc, C.LOGO_CHAMBER.path, C.LOGO_CHAMBER.x, C.LOGO_CHAMBER.y, {
        width: C.LOGO_CHAMBER.width, fit: [86, 46],
      });
      safeImage(doc, C.LOGO_RAILWAY.path, C.LOGO_RAILWAY.x, C.LOGO_RAILWAY.y, {
        width: C.LOGO_RAILWAY.width, fit: [44, 44],
      });

      // ══════════════════════════════════════════════════════════════
      // 6. RIBBON
      // ══════════════════════════════════════════════════════════════
      doc.rect(0, C.RIBBON.y, C.PAGE.width, C.RIBBON.height)
         .fill(themeColor);

      doc.fillColor(C.RIBBON.textColor)
         .font(C.RIBBON.font)
         .fontSize(C.RIBBON.textSize)
         .text(ribbonLabel, 0, C.RIBBON.y + 5, {
           align: "center",
           width: C.PAGE.width,
           characterSpacing: C.RIBBON.letterSpacing,
         });

      // Non-transferable note
      if (showFooter && mode !== "scan") {
        doc.fillColor(C.FOOTER_NOTE.color)
           .font("Helvetica").fontSize(C.FOOTER_NOTE.size)
           .text("Non-transferable  •  Valid only for RailTrans Expo 2026",
                 0, C.FOOTER_NOTE.y,
                 { align: "center", width: C.PAGE.width });
      }

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };