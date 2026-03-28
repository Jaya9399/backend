// badgeGenerator.js — RailTrans Expo 2026
"use strict";

const fs = require("fs");
const path = require("path");
const PDF = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const C = require("./badgeConfig");

// ── Helper: try multiple paths for an image asset ───────────────────────────

function safeImage(doc, filePath, x, y, width, opts = {}) {
  if (!filePath) return false;

  const possiblePaths = [
    filePath,
    path.join(process.cwd(), filePath),
    path.join(__dirname, "..", "assets", "bg",     path.basename(filePath)),
    path.join(__dirname, "..", "assets", "logos",  path.basename(filePath)),
    path.join(process.cwd(), "assets", "logos",    path.basename(filePath)),
    path.join(process.cwd(), "assets", "bg",       path.basename(filePath)),
  ];

  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      try {
        doc.image(tryPath, x, y, { width, ...opts });
        console.log(`✓ Loaded: ${path.basename(tryPath)}`);
        return true;
      } catch (_) { /* try next */ }
    }
  }

  console.warn(`✗ Missing: ${path.basename(filePath)}`);
  return false;
}

// ── Helper: rounded rectangle path ──────────────────────────────────────────

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

// ── Helper: draw a labelled pill / badge (used for org/assoc labels) ─────────

function drawLabelPill(doc, text, x, y, bgColor, textColor) {
  doc.font("Helvetica-Bold").fontSize(6.5);
  const tw = doc.widthOfString(text);
  const pw = tw + 12;
  const ph = 14;
  roundedRect(doc, x, y, pw, ph, 3);
  doc.fill(bgColor);
  doc.fillColor(textColor)
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .text(text, x + 6, y + 3, { width: tw, lineBreak: false });
}

// ── Main badge generator ─────────────────────────────────────────────────────

async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { mode = "email" } = options;

      // ── Resolve ticket code ──────────────────────────────────────────────
      const ticketCode =
        data?.ticket_code || data?.ticketCode || data?.data?.ticket_code;
      if (!ticketCode) throw new Error("ticket_code missing");

      // ── Determine badge theme (ribbon label + colour) ────────────────────
      const isPaid =
        Boolean(data.txId) ||
        data.paid === true ||
        Number(data.amount) > 0;

      console.log("ENTITY:", entity, "  isPaid:", isPaid);

      const { ribbon: ribbonLabel, color: themeColor } =
        getBadgeTheme({ entity, isPaid });

      console.log(`Generating [${ribbonLabel}] badge for: ${data.name || "(no name)"}`);

      // ── Create PDF ───────────────────────────────────────────────────────
      const doc = new PDF({ size: [C.PAGE.width, C.PAGE.height], margin: 0 });
      const buffers = [];
      doc.on("data", chunk => buffers.push(chunk));
      doc.on("end",  () => resolve(Buffer.concat(buffers)));

      // ═════════════════════════════════════════════════════════════════════
      // 1. TOP COLOUR STRIP  (thin, matches ribbon colour)
      // ═════════════════════════════════════════════════════════════════════
      doc.rect(0, C.TOP_STRIP.y, C.PAGE.width, C.TOP_STRIP.height)
         .fill(themeColor);

      // ═════════════════════════════════════════════════════════════════════
      // 2. HEADER  — cream background + full RailTrans logo + Mandapam logo
      // ═════════════════════════════════════════════════════════════════════
      doc.rect(0, C.HEADER.y, C.PAGE.width, C.HEADER.height)
         .fill(C.HEADER.bgColor);

      // Full RailTrans branding logo (already contains dates, venue text etc.)
      safeImage(doc, C.LOGO_RAILTRANS.path,
        C.LOGO_RAILTRANS.x, C.LOGO_RAILTRANS.y, C.LOGO_RAILTRANS.width);

      // Bharat Mandapam logo (top-right)
      safeImage(doc, C.MANDAPAM.path,
        C.MANDAPAM.x, C.MANDAPAM.y, C.MANDAPAM.width);

      // Optional standalone date boxes / month / venue
      // (only drawn when the logo does NOT already include them)
      if (C.DATE_BOX_03.enabled) {
        const db03 = C.DATE_BOX_03;
        doc.rect(db03.x, db03.y, db03.w, db03.h).fill(db03.bgColor);
        doc.fillColor(db03.textColor).font("Helvetica-Bold").fontSize(db03.fontSize)
           .text(db03.text, db03.x, db03.y + 8, { width: db03.w, align: "center" });
      }
      if (C.DATE_BOX_04.enabled) {
        const db04 = C.DATE_BOX_04;
        doc.rect(db04.x, db04.y, db04.w, db04.h).fill(db04.bgColor);
        doc.fillColor(db04.textColor).font("Helvetica-Bold").fontSize(db04.fontSize)
           .text(db04.text, db04.x, db04.y + 8, { width: db04.w, align: "center" });
      }
      if (C.MONTH_YEAR.enabled) {
        const my = C.MONTH_YEAR;
        doc.fillColor(my.color).font(my.font).fontSize(my.fontSize)
           .text(my.text, my.x, my.y);
      }
      if (C.VENUE.enabled) {
        const v = C.VENUE;
        doc.fillColor(v.color).font(v.font).fontSize(v.fontSize)
           .text(v.text, v.x, v.y);
      }

      // ═════════════════════════════════════════════════════════════════════
      // 3. TAGLINE BAR  — outline-pill style (no solid red fill)
      // ═════════════════════════════════════════════════════════════════════
      doc.rect(0, C.TAGLINE.y, C.PAGE.width, C.TAGLINE.height)
         .fill(C.TAGLINE.bgColor);

      const tg = C.TAGLINE;
      doc.font("Helvetica-Bold").fontSize(tg.fontSize);
      const tgTextW  = doc.widthOfString(tg.text);
      const pillW    = Math.min(tgTextW + 28, C.PAGE.width - 20);
      const pillX    = (C.PAGE.width - pillW) / 2;
      const pillH    = tg.height - 8;
      const pillY    = tg.y + 4;

      // Draw outline pill (no fill, just border)
      roundedRect(doc, pillX, pillY, pillW, pillH, pillH / 2);
      doc.fillAndStroke(tg.pillBgColor === "transparent" ? "white" : tg.pillBgColor,
                        tg.pillBorderColor);

      // Pill text
      doc.fillColor(tg.textColor)
         .font("Helvetica-Bold")
         .fontSize(tg.fontSize)
         .text(tg.text, pillX + 10, pillY + (pillH - tg.fontSize) / 2 + 1, {
           width:     pillW - 20,
           align:     "center",
           lineBreak: false,
         });

      // ═════════════════════════════════════════════════════════════════════
      // 4. BODY BACKGROUND  — railway-track image fills the entire body zone
      //    (from BODY.startY all the way down to RIBBON.y, covering logos too)
      // ═════════════════════════════════════════════════════════════════════
      const bodyH = C.RIBBON.y - C.BODY.startY;
      doc.rect(0, C.BODY.startY, C.PAGE.width, bodyH)
         .fill(C.BODY.bgColor);           // solid fallback colour first

      // Stretch background image to fill the whole body zone
      const bgLoaded = safeImage(
        doc,
        C.BODY.bgImage,
        0, C.BODY.startY,
        C.PAGE.width,
        { height: bodyH, cover: [C.PAGE.width, bodyH] }  // cover = stretch/crop
      );
      if (!bgLoaded) {
        // If image missing, draw a subtle gradient-like gradient using rects
        const steps = 8;
        for (let i = 0; i < steps; i++) {
          const alpha = Math.round(200 + (i / steps) * 50);
          doc.rect(0, C.BODY.startY + (i * bodyH / steps), C.PAGE.width, bodyH / steps)
             .fill(C.BODY.bgColor);
        }
      }

      // ═════════════════════════════════════════════════════════════════════
      // 5. QR CARD  — white rounded card, centred in the body
      // ═════════════════════════════════════════════════════════════════════
      const qc = C.QR_CARD;
      roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.fill(qc.bgColor);

      doc.strokeColor(qc.borderColor).lineWidth(qc.borderWidth);
      roundedRect(doc, qc.x, qc.y, qc.width, qc.height, qc.radius);
      doc.stroke();

      // QR code centred inside the card
      const qrPayload =
        mode === "scan"
          ? ticketCode
          : JSON.stringify({ ticket_code: ticketCode, entity });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: C.QR.size * 3,
      });
      const qrBuf = Buffer.from(qrDataUrl.split(",")[1], "base64");
      const qrX   = qc.x + (qc.width  - C.QR.size) / 2;
      const qrY   = qc.y + (qc.height - C.QR.size) / 2;
      doc.image(qrBuf, qrX, qrY, { width: C.QR.size });

      // ═════════════════════════════════════════════════════════════════════
      // 6. NAME & COMPANY  (rendered below the QR card, on body bg)
      // ═════════════════════════════════════════════════════════════════════
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
           .text(name, 0, C.TEXT_AREA.nameY, {
             align: "center",
             width: C.PAGE.width,
           });
      }

      if (company) {
        doc.fillColor("#333333")
           .font("Helvetica")
           .fontSize(C.TEXT_AREA.companyFontSize)
           .text(company, 0, C.TEXT_AREA.companyY, {
             align: "center",
             width: C.PAGE.width,
           });
      }

      // ═════════════════════════════════════════════════════════════════════
      // 7. FOOTER LOGOS  (overlaid on background image — no separate white block)
      // ═════════════════════════════════════════════════════════════════════
      // Only draw a white block if the config asks for it
      if (C.FOOTER.useSeparateBlock) {
        doc.rect(0, C.FOOTER.y, C.PAGE.width, C.FOOTER.height)
           .fill("#FFFFFF");
        doc.strokeColor(C.FOOTER.borderTopColor).lineWidth(1)
           .moveTo(0, C.FOOTER.y).lineTo(C.PAGE.width, C.FOOTER.y).stroke();
      }

      // "ORGANISED BY" pill label + logo
      const org = C.ORGANISED_BY;
      drawLabelPill(doc, org.label,
        org.labelX, org.labelY,
        org.labelBgColor, org.labelTextColor);
      safeImage(doc, org.logoPath, org.logoX, org.logoY, org.logoWidth);

      // "IN ASSOCIATION WITH" pill label + logos
      const assoc = C.ASSOCIATION;
      drawLabelPill(doc, assoc.label,
        assoc.labelX, assoc.labelY,
        assoc.labelBgColor, assoc.labelTextColor);
      safeImage(doc, assoc.logo1Path, assoc.logo1X, assoc.logo1Y, assoc.logo1Width);
      safeImage(doc, assoc.logo2Path, assoc.logo2X, assoc.logo2Y, assoc.logo2Width);

      // ═════════════════════════════════════════════════════════════════════
      // 8. RIBBON  — large block at the very bottom, entity label in big text
      // ═════════════════════════════════════════════════════════════════════
      doc.rect(0, C.RIBBON.y, C.PAGE.width, C.RIBBON.height)
         .fill(themeColor);

      const ribbonTextY =
        C.RIBBON.y + (C.RIBBON.height - C.RIBBON.textSize) / 2 - 2;

      doc.fillColor(C.RIBBON.textColor)
         .font(C.RIBBON.font)
         .fontSize(C.RIBBON.textSize)
         .text(ribbonLabel, 0, ribbonTextY, {
           align: "center",
           width: C.PAGE.width,
         });

      doc.end();

    } catch (err) {
      console.error("Badge generation error:", err);
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };