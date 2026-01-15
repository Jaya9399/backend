/**
 * badgeGenerator.js
 *
 * Responsibility:
 * Generate E-Badge as a PDF (with QR code) for download & email
 */

const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");

/**
 * generateBadgePDF
 *
 * @param {string} entity - visitors | speakers | exhibitors | partners | awardees
 * @param {object} data  - registration document from DB
 *
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateBadgePDF(entity, data) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data || !data.ticket_code) {
        throw new Error("ticket_code is required for badge generation");
      }

      /* ---------- PAID / FREE DETECTION ---------- */
      const isPaid =
        Boolean(data.txId) ||
        data.paid === true ||
        Number(data.amount || data.total || data.price || 0) > 0;

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
      doc
        .fillColor(DARK)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(data.name || "Attendee", 40, 145, {
          width: 280,
          align: "center",
        });

      /* ---------- COMPANY ---------- */
      if (data.company) {
        doc
          .fillColor(MUTED)
          .fontSize(11)
          .font("Helvetica")
          .text(data.company, 40, 170, {
            width: 280,
            align: "center",
          });
      }

      /* ---------- QR CODE ---------- */
      const qrPayload = JSON.stringify({
        ticket_code: data.ticket_code,
        name: data.name || "",
        entity,
      });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 180,
      });

      const qrBase64 = qrDataUrl.split(",")[1];
      const qrBuffer = Buffer.from(qrBase64, "base64");

      doc.image(qrBuffer, 90, 205, {
        width: 180,
        height: 180,
      });

      /* ---------- TICKET CODE ---------- */
      doc
        .fillColor(DARK)
        .fontSize(10)
        .font("Courier-Bold")
        .text(`Ticket Code: ${data.ticket_code}`, 0, 395, {
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
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica")
        .text(
          "Non-transferable • Valid only for RailTrans Expo 2026",
          20,
          510,
          {
            width: 320,
            align: "center",
          }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateBadgePDF,
};
