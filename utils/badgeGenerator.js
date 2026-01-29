const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const getBadgeTheme = require("./badgeTheme");
const CONFIG = require("./badgeConfig");

const ALLOWED_ENTITIES = [
  "visitors",
  "exhibitors",
  "partners",
  "speakers",
  "awardees",
];

async function generateBadgePDF(entity, data, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!ALLOWED_ENTITIES.includes(entity)) {
        throw new Error(`Unsupported entity: ${entity}`);
      }

      const { mode = "email", showFooter = true } = options;

      const ticketCode =
        data?.ticket_code ||
        data?.ticketCode ||
        data?.data?.ticket_code;

      if (!ticketCode) {
        throw new Error("ticket_code missing");
      }

      const isPaid =
        Boolean(data.txId) ||
        data.paid === true ||
        Number(data.amount || 0) > 0;

      const { ribbon, color } = getBadgeTheme({ entity, isPaid });

      const doc = new PDFDocument({
        size: [CONFIG.PAGE.width, CONFIG.PAGE.height],
        margin: 0,
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      /* ---------- BACKGROUND IMAGE ---------- */
      doc.save();
      doc.opacity(CONFIG.BACKGROUND.opacity);
      doc.image(CONFIG.BACKGROUND.path, 0, 0, {
        width: CONFIG.PAGE.width,
        height: CONFIG.PAGE.height,
      });
      doc.restore();

      /* ---------- TOP COLOR STRIP ---------- */
      doc
        .rect(0, 0, CONFIG.PAGE.width, CONFIG.TOP_STRIP.height)
        .fill(color);

      /* ---------- HEADER ---------- */
      doc
        .rect(
          0,
          CONFIG.TOP_STRIP.height,
          CONFIG.PAGE.width,
          CONFIG.HEADER.height
        )
        .fill(CONFIG.HEADER.bgColor);

      doc
        .strokeColor(CONFIG.HEADER.borderColor)
        .moveTo(0, CONFIG.TOP_STRIP.height + CONFIG.HEADER.height)
        .lineTo(
          CONFIG.PAGE.width,
          CONFIG.TOP_STRIP.height + CONFIG.HEADER.height
        )
        .stroke();

      /* ---------- LOGOS ---------- */
      Object.values(CONFIG.LOGOS).forEach(logo => {
        doc.image(logo.path, logo.x, logo.y, {
          width: logo.width,
        });
      });

      /* ---------- NAME ---------- */
      const name = data.name || data.full_name || "UNKNOWN";
      doc
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .fontSize(CONFIG.NAME.size)
        .text(name, 0, CONFIG.NAME.y, { align: "center" });

      /* ---------- COMPANY ---------- */
      if (data.company || data.organization) {
        doc
          .fillColor("#4B5563")
          .font("Helvetica")
          .fontSize(CONFIG.COMPANY.size)
          .text(
            data.company || data.organization,
            0,
            CONFIG.COMPANY.y,
            { align: "center" }
          );
      }

      /* ---------- QR ---------- */
      const qrPayload =
        mode === "scan"
          ? ticketCode
          : JSON.stringify({ ticket_code: ticketCode, entity });

      const qrSize =
        mode === "scan"
          ? CONFIG.QR.sizeScan
          : CONFIG.QR.sizeEmail;

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: qrSize,
      });

      const qrBuffer = Buffer.from(
        qrDataUrl.split(",")[1],
        "base64"
      );

      doc.image(
        qrBuffer,
        (CONFIG.PAGE.width - qrSize) / 2,
        CONFIG.QR.y,
        { width: qrSize }
      );

      /* ---------- BOTTOM RIBBON ---------- */
      doc
        .rect(0, CONFIG.RIBBON.y, CONFIG.PAGE.width, CONFIG.RIBBON.height)
        .fill(color);

      doc
        .fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(CONFIG.RIBBON.fontSize)
        .text(ribbon, 0, CONFIG.RIBBON.y + 18, {
          align: "center",
        });

      /* ---------- FOOTER ---------- */
      if (showFooter && mode !== "scan") {
        doc
          .fillColor("#6B7280")
          .font("Helvetica")
          .fontSize(CONFIG.FOOTER.size)
          .text(
            "Non-transferable • Valid only for RailTrans Expo 2026",
            0,
            CONFIG.FOOTER.y,
            { align: "center" }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateBadgePDF };
