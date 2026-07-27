const nodemailer = require("nodemailer");

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends an email. Throws if SMTP is not configured or the send fails —
 * callers should catch this so a broken mail server never silently
 * "succeeds" (that was part of why verification mail was never arriving).
 */
async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env"
    );
  }
  const transporter = buildTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

function verificationEmailTemplate({ name, verifyUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#0f766e;">Welcome to MARKET PLACE, ${name}!</h2>
      <p>Please verify your email address to activate your account and start your 3 free trial services.</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${verifyUrl}" style="background:linear-gradient(90deg,#0f766e,#ea580c);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Verify Email</a>
      </p>
      <p>Or paste this link into your browser:</p>
      <p style="word-break:break-all;color:#0f766e;">${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>
  `;
}

function otpEmailTemplate({ name, otp }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#0f766e;">Your login code</h2>
      <p>Hi ${name}, use this one-time code to complete your login:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;text-align:center;color:#ea580c;">${otp}</p>
      <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

function passwordResetTemplate({ name, resetUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#0f766e;">Reset your password</h2>
      <p>Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${resetUrl}" style="background:#0f766e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
      </p>
    </div>
  `;
}

module.exports = {
  sendEmail,
  verificationEmailTemplate,
  otpEmailTemplate,
  passwordResetTemplate,
};
