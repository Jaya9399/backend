const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.zoho.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || "support@railtransexpo.com",
    pass: process.env.SMTP_PASS || "RTExpoSupport@2026**"
  },
  tls: { rejectUnauthorized: false }
});

transporter.verify(function(error, success) {
  if (error) {
    console.error("SMTP connection error:", error);
  } else {
    console.log("Server is ready to take our messages");
  }
});