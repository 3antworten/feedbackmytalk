import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { formatSession } from "../format.js";

const router = Router();

function summarize(session) {
  const deck = db.prepare("SELECT id, name FROM decks WHERE id = ?").get(session.deck_id);
  const slideCount = db
    .prepare("SELECT COUNT(*) AS n FROM slides WHERE deck_id = ? AND is_general = 0")
    .get(session.deck_id).n;
  return { session: formatSession(session), deck, slideCount };
}

// Public: look up a session by its join code (for the join screen, and to resolve a join
// code back to a session id on every subsequent participant page load).
router.get("/:joinCode", (req, res) => {
  const session = db
    .prepare("SELECT * FROM sessions WHERE join_code = ?")
    .get(req.params.joinCode.toUpperCase());
  if (!session) return res.status(404).json({ error: "No session found for this link" });
  res.json(summarize(session));
});

// Public: join a session, optionally with a display name. Returns a persistent participant token.
router.post("/:joinCode", (req, res) => {
  const session = db
    .prepare("SELECT * FROM sessions WHERE join_code = ?")
    .get(req.params.joinCode.toUpperCase());
  if (!session) return res.status(404).json({ error: "No session found for this link" });

  const displayName = (req.body?.displayName || "").trim().slice(0, 80) || null;
  const joinOrder = 1 + db.prepare("SELECT COUNT(*) AS n FROM participants WHERE session_id = ?").get(session.id).n;

  const id = nanoid();
  const token = nanoid(32);
  db.prepare(
    "INSERT INTO participants (id, session_id, token, display_name, join_order) VALUES (?, ?, ?, ?, ?)"
  ).run(id, session.id, token, displayName, joinOrder);

  const participant = { id, sessionId: session.id, token, displayName, joinOrder };
  res.status(201).json({ participant, session: formatSession(session) });
});

export default router;
