import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config.js";
import { db } from "./db/index.js";
import { formatSpeaker } from "./format.js";

const COOKIE_NAME = "fmt_token";

export function issueSpeakerCookie(res, speakerId) {
  const token = jwt.sign({ sub: speakerId }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSpeakerCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Attaches req.speaker (formatted, incl. isAdmin) if a valid cookie is present; does not reject.
export function attachSpeaker(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const speaker = db.prepare("SELECT * FROM speakers WHERE id = ?").get(payload.sub);
      if (speaker) req.speaker = formatSpeaker(speaker);
    } catch {
      // ignore invalid/expired token
    }
  }
  next();
}

// Rejects if no authenticated speaker.
export function requireSpeaker(req, res, next) {
  if (!req.speaker) return res.status(401).json({ error: "Not authenticated" });
  next();
}

// Rejects if the authenticated speaker isn't the site admin.
export function requireAdmin(req, res, next) {
  if (!req.speaker) return res.status(401).json({ error: "Not authenticated" });
  if (!req.speaker.isAdmin) return res.status(403).json({ error: "Admin access required" });
  next();
}

// Resolves a participant from the X-Participant-Token header, scoped to :sessionId in the route.
export function attachParticipant(req, _res, next) {
  const token = req.header("X-Participant-Token");
  if (token) {
    const participant = db.prepare("SELECT * FROM participants WHERE token = ?").get(token);
    if (participant) req.participant = participant;
  }
  next();
}

export function requireParticipant(req, res, next) {
  if (!req.participant) return res.status(401).json({ error: "Not joined" });
  next();
}
