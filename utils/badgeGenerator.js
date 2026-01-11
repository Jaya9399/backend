/**
 * badgeGenerator.js
 *
 * Responsibility:
 * Generate E-Badge as a PDF (with QR code) for download & email
 */

const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

/**
 * generateBadgePDF
 *
 * @param {string} entity - visitors | speakers | exhibitors | partners | awardees | organizers
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

      const doc = new PDFDocument({
        size: [360, 520], // Badge size
        margin: 20,
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      /* ---------- COLORS ---------- */
      const BRAND = "#C8102E";
      const DARK = "#111827";
      const MUTED = "#6B7280";

      /* ---------- HEADER ---------- */
      doc
        .rect(0, 0, 360, 90)
        .fill(BRAND);

      doc
        .fillColor("white")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("RailTrans Expo 2026", 0, 32, { align: "center" });

      /* ---------- ROLE LABEL ---------- */
      const roleLabel = entity.toUpperCase();

      doc
        .rect(80, 110, 200, 32)
        .fill(BRAND);

      doc
        .fillColor("white")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(roleLabel, 80, 118, {
          width: 200,
          align: "center",
        });

      /* ---------- NAME ---------- */
      doc
        .fillColor(DARK)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(data.name || "Attendee", 20, 170, {
          width: 320,
          align: "center",
        });

      /* ---------- COMPANY ---------- */
      if (data.company) {
        doc
          .fillColor(MUTED)
          .fontSize(11)
          .font("Helvetica")
          .text(data.company, 20, 195, {
            width: 320,
            align: "center",
          });
      }

      /* ---------- QR CODE ---------- */
      const qrPayload = JSON.stringify({
        ticket_code: data.ticket_code,
        name: data.name,
        role: entity,
      });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 200,
      });

      const qrBase64 = qrDataUrl.split(",")[1];
      const qrBuffer = Buffer.from(qrBase64, "base64");

      doc.image(qrBuffer, 80, 230, {
        width: 200,
        height: 200,
      });

      /* ---------- TICKET CODE ---------- */
      doc
        .fillColor(DARK)
        .fontSize(10)
        .font("Courier-Bold")
        .text(`Ticket Code: ${data.ticket_code}`, 0, 450, {
          align: "center",
        });

      /* ---------- FOOTER ---------- */
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica")
        .text(
          "Non-transferable • Valid only for RailTrans Expo 2026",
          20,
          480,
          { width: 320, align: "center" }
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
