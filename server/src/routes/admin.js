import { Router } from "express";
import { db } from "../db/index.js";
import { requireAdmin } from "../auth.js";
import { getSignupsEnabled, setSignupsEnabled } from "../settings.js";
import { removeDeckFiles } from "../uploads.js";
import { MAIL_ENABLED } from "../config.js";

const router = Router();

router.use(requireAdmin);

router.get("/settings", (_req, res) => {
  res.json({ signupsEnabled: getSignupsEnabled(), mailEnabled: MAIL_ENABLED });
});

router.patch("/settings", (req, res) => {
  if (typeof req.body?.signupsEnabled !== "boolean") {
    return res.status(400).json({ error: "signupsEnabled must be a boolean" });
  }
  setSignupsEnabled(req.body.signupsEnabled);
  res.json({ signupsEnabled: getSignupsEnabled(), mailEnabled: MAIL_ENABLED });
});

router.get("/speakers", (_req, res) => {
  const speakers = db
    .prepare(
      `SELECT s.id, s.email, s.is_admin, s.email_confirmed_at, s.created_at,
              (SELECT COUNT(*) FROM decks d WHERE d.speaker_id = s.id) AS deck_count,
              (SELECT COUNT(*) FROM sessions se JOIN decks d ON d.id = se.deck_id WHERE d.speaker_id = s.id) AS session_count
       FROM speakers s ORDER BY s.created_at ASC`
    )
    .all()
    .map((row) => ({
      id: row.id,
      email: row.email,
      isAdmin: !!row.is_admin,
      emailConfirmed: !!row.email_confirmed_at,
      createdAt: row.created_at,
      deckCount: row.deck_count,
      sessionCount: row.session_count,
    }));
  res.json({ speakers });
});

router.delete("/speakers/:id", (req, res) => {
  if (req.params.id === req.speaker.id) {
    return res.status(400).json({ error: "You can't delete your own account" });
  }
  const speaker = db.prepare("SELECT * FROM speakers WHERE id = ?").get(req.params.id);
  if (!speaker) return res.status(404).json({ error: "Speaker not found" });

  const deckIds = db.prepare("SELECT id FROM decks WHERE speaker_id = ?").all(speaker.id).map((d) => d.id);
  db.prepare("DELETE FROM speakers WHERE id = ?").run(speaker.id); // cascades decks/sessions/etc.
  for (const deckId of deckIds) removeDeckFiles(deckId);

  res.status(204).end();
});

router.get("/decks", (_req, res) => {
  const decks = db
    .prepare(
      `SELECT d.id, d.name, d.created_at, s.email AS speaker_email,
              (SELECT COUNT(*) FROM slides sl WHERE sl.deck_id = d.id AND sl.is_general = 0) AS slide_count,
              (SELECT COUNT(*) FROM sessions se WHERE se.deck_id = d.id) AS session_count
       FROM decks d JOIN speakers s ON s.id = d.speaker_id
       ORDER BY d.created_at DESC`
    )
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      speakerEmail: row.speaker_email,
      slideCount: row.slide_count,
      sessionCount: row.session_count,
    }));
  res.json({ decks });
});

router.delete("/decks/:id", (req, res) => {
  const deck = db.prepare("SELECT * FROM decks WHERE id = ?").get(req.params.id);
  if (!deck) return res.status(404).json({ error: "Deck not found" });
  db.prepare("DELETE FROM decks WHERE id = ?").run(deck.id); // cascades slides/sessions/etc.
  removeDeckFiles(deck.id);
  res.status(204).end();
});

export default router;
