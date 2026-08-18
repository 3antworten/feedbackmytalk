import "dotenv/config";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";
export const PORT = process.env.PORT || 3001;

// The public URL this app is reachable at (no trailing slash). Used to build absolute links
// in emails (e.g. the account-confirmation link). In production this should be the one
// domain that serves both the frontend and /api, e.g. "https://feedbackmytalk.com".
export const APP_DOMAIN = (process.env.APP_DOMAIN || "http://localhost:5173").replace(/\/+$/, "");

// Mail is entirely optional: if SMTP_HOST isn't set, the app falls back to its original
// behavior of auto-confirming every new account (no email sent, no confirmation step).
export const SMTP_HOST = process.env.SMTP_HOST || null;
export const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
export const SMTP_SECURE = process.env.SMTP_SECURE === "true";
export const SMTP_USER = process.env.SMTP_USER || null;
export const SMTP_PASS = process.env.SMTP_PASS || null;
export const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@localhost";

export const MAIL_ENABLED = !!SMTP_HOST;

if (MAIL_ENABLED && !process.env.APP_DOMAIN) {
  console.warn(
    "[config] SMTP is configured but APP_DOMAIN is not set — confirmation emails will link to " +
      `${APP_DOMAIN}, which is almost certainly wrong in production. Set APP_DOMAIN to your public URL.`
  );
}
