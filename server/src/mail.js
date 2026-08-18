import nodemailer from "nodemailer";
import {
  MAIL_ENABLED,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  APP_DOMAIN,
} from "./config.js";

const transporter = MAIL_ENABLED
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

export async function sendConfirmationEmail(toEmail, token) {
  if (!transporter) return;
  const link = `${APP_DOMAIN}/confirm-email/${token}`;
  await transporter.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: "Confirm your Feedback My Talk account",
    text: [
      "Welcome to Feedback My Talk!",
      "",
      "Please confirm your email address by opening this link:",
      link,
      "",
      "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>Welcome to Feedback My Talk!</p>
      <p>Please confirm your email address by clicking the link below:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    `,
  });
}
