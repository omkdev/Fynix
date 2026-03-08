const nodemailer = require("nodemailer");

// Use AWS SES in production: set SMTP_HOST, SMTP_USER, SMTP_PASS (SES SMTP credentials)
// Or use Ethereal / Gmail for dev
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

async function sendReminderEmail(toEmail, subject, text) {
  try {
    const from = process.env.EMAIL_FROM || "Fynix <noreply@fynix.local>";
    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("Email send error:", err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendReminderEmail };
