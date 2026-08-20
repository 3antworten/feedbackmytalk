import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { issueSpeakerCookie, clearSpeakerCookie, requireSpeaker } from "../auth.js";
import { formatSpeaker } from "../format.js";
import { getSignupsEnabled, speakerCount } from "../settings.js";
import { MAIL_ENABLED } from "../config.js";
import { sendConfirmationEmail } from "../mail.js";

const router = Router();

const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function issueConfirmationToken(speakerId) {
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS).toISOString();
  db.prepare(
    "UPDATE speakers SET confirmation_token = ?, confirmation_token_expires_at = ? WHERE id = ?"
  ).run(token, expiresAt, speakerId);
  return token;
}

// Public: whether the register screen should let someone sign up right now.
router.get("/signup-status", (_req, res) => {
  const isFirstAccount = speakerCount() === 0;
  res.json({ enabled: isFirstAccount || getSignupsEnabled() });
});

router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  const isFirstAccount = speakerCount() === 0;
  if (!isFirstAccount && !getSignupsEnabled()) {
    return res.status(403).json({ error: "Sign-ups are currently disabled by the site admin" });
  }
  const normalizedEmail = email.toLowerCase();
  const existing = db.prepare("SELECT id FROM speakers WHERE email = ?").get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  // The bootstrap admin account always gets in immediately, even with mail configured —
  // otherwise a misconfigured SMTP server could lock the very first operator out entirely.
  const requiresConfirmation = MAIL_ENABLED && !isFirstAccount;

  const id = nanoid();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO speakers (id, email, password_hash, is_admin, email_confirmed_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, normalizedEmail, passwordHash, isFirstAccount ? 1 : 0, requiresConfirmation ? null : new Date().toISOString());

  if (requiresConfirmation) {
    const token = issueConfirmationToken(id);
    try {
      await sendConfirmationEmail(normalizedEmail, token);
    } catch (err) {
      db.prepare("DELETE FROM speakers WHERE id = ?").run(id); // let them retry cleanly
      console.error("[auth] failed to send confirmation email:", err.message);
      return res.status(502).json({ error: "Could not send the confirmation email. Please try again shortly." });
    }
    return res.status(201).json({ requiresConfirmation: true, email: normalizedEmail });
  }

  const speaker = formatSpeaker({
    id,
    email: normalizedEmail,
    is_admin: isFirstAccount ? 1 : 0,
    email_confirmed_at: new Date().toISOString(),
  });
  issueSpeakerCookie(res, id);
  res.status(201).json({ speaker });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const row = db.prepare("SELECT * FROM speakers WHERE email = ?").get(email.toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (!row.email_confirmed_at) {
    return res.status(403).json({
      error: "Please confirm your email address before logging in — check your inbox for the link.",
      requiresConfirmation: true,
      email: row.email,
    });
  }
  issueSpeakerCookie(res, row.id);
  res.json({ speaker: formatSpeaker(row) });
});

router.post("/logout", (_req, res) => {
  clearSpeakerCookie(res);
  res.status(204).end();
});

router.get("/me", requireSpeaker, (req, res) => {
  res.json({ speaker: req.speaker });
});

// Hands control back to the admin who started an impersonation session (see
// POST /api/admin/impersonate/:id).
router.post("/stop-impersonating", requireSpeaker, (req, res) => {
  if (!req.speaker.impersonatedBy) return res.status(400).json({ error: "Not impersonating" });
  const admin = db.prepare("SELECT * FROM speakers WHERE id = ?").get(req.speaker.impersonatedBy);
  if (!admin) return res.status(404).json({ error: "Admin account not found" });
  issueSpeakerCookie(res, admin.id);
  res.json({ speaker: formatSpeaker(admin) });
});

// Consumes a confirmation link's token, activates the account, and logs the speaker in.
router.post("/confirm-email/:token", (req, res) => {
  const row = db.prepare("SELECT * FROM speakers WHERE confirmation_token = ?").get(req.params.token);
  if (!row) return res.status(400).json({ error: "This confirmation link is invalid or was already used." });
  if (new Date(row.confirmation_token_expires_at) < new Date()) {
    return res.status(400).json({
      error: "This confirmation link has expired. Request a new one from the login screen.",
    });
  }
  db.prepare(
    "UPDATE speakers SET email_confirmed_at = ?, confirmation_token = NULL, confirmation_token_expires_at = NULL WHERE id = ?"
  ).run(new Date().toISOString(), row.id);
  issueSpeakerCookie(res, row.id);
  res.json({ speaker: formatSpeaker({ ...row, email_confirmed_at: new Date().toISOString() }) });
});

// Public, deliberately generic response either way — avoids leaking which emails are registered.
router.post("/resend-confirmation", async (req, res) => {
  const email = (req.body?.email || "").toLowerCase();
  const genericResponse = { message: "If that account needs confirming, we've sent a new email." };

  const row = email && db.prepare("SELECT * FROM speakers WHERE email = ?").get(email);
  if (row && !row.email_confirmed_at && MAIL_ENABLED) {
    const token = issueConfirmationToken(row.id);
    try {
      await sendConfirmationEmail(row.email, token);
    } catch (err) {
      console.error("[auth] failed to resend confirmation email:", err.message);
    }
  }
  res.json(genericResponse);
});

export default router;
