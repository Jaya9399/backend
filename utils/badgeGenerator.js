/**
 * badgeGenerator. js
 *
 * ONE badge generator for all use cases:  
 * - Email attachments (mode: "email")
 * - Scan/print at venue (mode: "scan")
 * - Admin download
 *
 * Supports two modes:
 * - email: Standard badge with JSON QR payload, normal size, includes footer text
 * - scan: Optimized for printing with larger QR, simpler payload, NO footer text (ribbon is footer)
 */

const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");

/**
 * generateBadgePDF
 *
 * @param {string} entity - visitors | speakers | exhibitors | partners | awardees
 * @param {object} data - registration document from DB
 * @param {object} options - { mode: "email" | "scan", showFooter: true }
 *
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { mode = "email", showFooter = true } = options;

      // 🔥 NORMALIZE ticket_code (CRITICAL)
      const ticketCode =
        data?.ticket_code ||
        data?.ticketCode ||
        data?.data?.ticket_code ||
        data?.data?.ticketCode;

      if (!ticketCode) {
        console.error("[badgeGenerator] Missing ticket_code", {
          entity,
          id: data?._id,
          keys: Object.keys(data || {}),
          dataKeys: Object.keys(data?.data || {}),
        });
        throw new Error("ticket_code is required for badge generation");
      }

      /* ---------- PAID / FREE DETECTION ---------- */
      const isPaid =
        Boolean(data.txId) ||
        data.paid === true ||
        Number(data.amount || data.total || data.price || data.ticket_price || data.ticket_total || 0) > 0;

      /* ---------- THEME (RIBBON + COLOR) ---------- */
      const { ribbon, color } = getBadgeTheme({
        entity,
        isPaid,
      });

      const doc = new PDFDocument({
        size: [360, 520],
        margin: 0,
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      /* ---------- CONSTANT COLORS ---------- */
      const HEADER_RED = "#C8102E";
      const DARK = "#111827";
      const MUTED = "#6B7280";
      const CARD_BORDER = "#CBD5E1";

      /* ---------- HEADER ---------- */
      doc.rect(0, 0, 360, 90).fill(HEADER_RED);

      doc
        .fillColor("white")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("RailTrans Expo 2026", 0, 32, {
          align: "center",
        });

      /* ---------- CENTER CARD ---------- */
      doc
        .roundedRect(30, 120, 300, 280, 14)
        .lineWidth(1)
        .stroke(CARD_BORDER)
        .fill("white");

      /* ---------- NAME ---------- */
      const name = data.name || data.full_name || "Attendee";
      doc
        .fillColor(DARK)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(name, 40, 145, {
          width: 280,
          align: "center",
        });

      /* ---------- COMPANY ---------- */
      if (data.company || data.organization) {
        doc
          .fillColor(MUTED)
          .fontSize(11)
          .font("Helvetica")
          .text(data.company || data.organization, 40, 170, {
            width: 280,
            align: "center",
          });
      }

      /* ---------- QR CODE ---------- */
      // For scan mode:  QR contains just ticket_code (simpler, faster scan)
      // For email mode: QR contains JSON payload (more info for validation)
      const qrPayload = mode === "scan"
        ? ticketCode
        : JSON.stringify({
          ticket_code: ticketCode,
          name,
          entity,
        });


      const qrSize = mode === "scan" ? 200 : 180; // Larger QR for scan mode

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: qrSize,
      });

      const qrBase64 = qrDataUrl.split(",")[1];
      const qrBuffer = Buffer.from(qrBase64, "base64");

      const qrY = mode === "scan" ? 195 : 205;
      const qrX = (360 - qrSize) / 2;

      doc.image(qrBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize,
      });

      /* ---------- TICKET CODE ---------- */
      doc
        .fillColor(DARK)
        .fontSize(10)
        .font("Courier-Bold")
        .text(`Ticket:  ${ticketCode}`, 0, 395, {
          align: "center",
        });

      /* ---------- BOTTOM RIBBON ---------- */
      doc.rect(0, 460, 360, 60).fill(color);

      doc
        .fillColor("white")
        .fontSize(26)
        .font("Helvetica-Bold")
        .text(ribbon, 0, 478, {
          align: "center",
        });

      /* ---------- FOOTER TEXT ---------- */
      // 🔥 FIX: Only show footer text in email mode (scan mode ribbon IS the footer)
      if (showFooter && mode !== "scan") {
        doc
          .fillColor(MUTED)
          .fontSize(8)
          .font("Helvetica")
          .text(
            "Non-transferable • Valid only for RailTrans Expo 2026",
            20,
            495, // 🔥 FIX:  Moved up from 510 to avoid clipping
            {
              width: 320,
              align: "center",
            }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateBadgePDF,
};