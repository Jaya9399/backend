const { generateBadgePDF } = require("./badgeGenerator");
const { buildTicketEmail } = require("./emailTemplate");
const mailer = require("./mailer");
const roleConfig = require("./emailRoleConfig");

module.exports = async function sendTicketEmail({
  entity,
  doc,
  frontendBase = "",
}) {
  const config = roleConfig[entity];

  if (!config) {
    throw new Error(`Unsupported entity for email: ${entity}`);
  }

  if (!doc?.email) {
    throw new Error("Recipient email missing");
  }

  let pdfBase64 = null;

  // 🔥 Badge attachment only if allowed
  if (config.attachBadge) {
    const pdfBuffer = await generateBadgePDF(entity, doc);
    pdfBase64 = pdfBuffer.toString("base64");
  }

  const emailPayload = await buildTicketEmail({
    frontendBase,
    entity,
    id: String(doc._id),
    name: doc.name,
    company: doc.company,
    ticket_category: doc.ticket_category,
    form: doc.data || doc,
    pdfBase64,
    upgradeUrl: config.allowUpgrade ? undefined : "", // disables button
  });

  // Override subject if needed
  if (config.subjectPrefix) {
    emailPayload.subject = `RailTrans Expo — ${config.subjectPrefix}`;
  }

  return mailer.sendMail({
    to: doc.email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
    attachments: emailPayload.attachments,
  });
};
