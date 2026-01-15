const { generateBadgePDF } = require("./badgeGenerator");
const { buildTicketEmail } = require("./emailTemplate");
const mailer = require("./mailer");
const roleConfig = require("./emailRoleConfig");

module.exports = async function sendTicketEmail({
  entity,
  record, // ← accept record (all routes use this)
  frontendBase = "",
  options = {}, // ← accept but ignore for now (future: forceSend, includeBadge, etc.)
}) {
  // Normalize: accept both 'record' and 'doc' for backward compatibility
  const doc = record;

  // emailRoleConfig uses plural: visitors, exhibitors, speakers, etc.
  const config = roleConfig[entity];

  if (!config) {
    throw new Error(`Unsupported entity for email: ${entity}`);
  }

  if (!doc?.email) {
    throw new Error("Recipient email missing");
  }

  // Handle nested data structure (visitors store form data in doc.data)
  // Support both: doc.company and doc.data.company
  const getField = (field) => {
    if (doc[field] !== undefined) {
      return doc[field];
    }
    return doc.data?.[field];
  };

  // Normalize data for badge generator (flatten nested structure)
  // Badge generator expects: ticket_code, name, company at top level
  const badgeData = {
    ... doc,
    // Ensure top-level fields are available (prefer top-level, fallback to nested)
    name: getField("name") ?? doc.name,
    company: getField("company") ?? doc.company,
    ticket_code: doc.ticket_code ??  doc.data?.ticket_code,
    // Preserve payment fields for paid/free detection
    txId: doc.txId ?? doc. data?.txId,
    paid: doc.paid ?? doc.data?.paid,
    amount: doc.amount ?? doc.data?.amount,
    total: doc.total ?? doc.data?.total,
    price: doc.price ?? doc.data?.price,
  };

  let pdfBase64 = null;

  // 🔥 Badge attachment only if allowed
  if (config.attachBadge) {
    const pdfBuffer = await generateBadgePDF(entity, badgeData);
    pdfBase64 = pdfBuffer.toString("base64");
  }

  const emailPayload = await buildTicketEmail({
    frontendBase,
    entity,
    id:  String(doc._id),
    name: getField("name") ?? doc.name,
    company: getField("company") ?? doc.company,
    ticket_category:  getField("ticket_category") ?? doc.ticket_category,
    form: doc.data ?? doc, // Pass full form data
    pdfBase64,
    upgradeUrl: config.allowUpgrade ?  undefined : "", // disables button
  });

  // Override subject if needed
  if (config.subjectPrefix) {
    emailPayload.subject = `RailTrans Expo — ${config.subjectPrefix}`;
  }

  const result = await mailer. sendMail({
    to:  doc.email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload. html,
    attachments: emailPayload.attachments,
  });

  // Return standardized result format that routes expect
  // Explicitly handle success/failure to avoid ambiguity
  if (result && result.success) {
    return {
      success: true,
      info: result.info,
      messageId: result.info?.messageId,
      dbRecordId:  result.dbRecordId,
    };
  } else {
    return {
      success: false,
      error: result?.error || "Mail send failed",
      dbRecordId: result?.dbRecordId,
    };
  }
};