import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { requireSpeaker } from "../auth.js";
import { formatSlide, formatSession, displayAuthor } from "../format.js";
import { voterKeyFor, voteSummaries } from "../votes.js";
import { responsesByQuestionId, withQuestionResponses } from "../questionResponses.js";

const router = Router();

// Ensures the resolved participant (from X-Participant-Token) belongs to the session in the URL.
function requireParticipantOfSession(req, res, next) {
  if (!req.participant || req.participant.session_id !== req.params.sessionId) {
    return res.status(401).json({ error: "Not joined to this session" });
  }
  next();
}

// Shared feedback views (comments/questions across the whole session) are visible to any
// participant joined to the session, or the speaker who owns it — attaches `req.sessionRow`
// and `req.canModerate` (true only for the owning speaker, who may delete others' items).
function requireSessionAccess(req, res, next) {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const isParticipant = req.participant && req.participant.session_id === session.id;
  const isOwningSpeaker =
    req.speaker &&
    db.prepare("SELECT 1 FROM decks WHERE id = ? AND speaker_id = ?").get(session.deck_id, req.speaker.id);
  if (!isParticipant && !isOwningSpeaker) {
    return res.status(401).json({ error: "Not authorized for this session" });
  }
  req.sessionRow = session;
  req.canModerate = !!isOwningSpeaker;
  next();
}

function generateJoinCode() {
  // Short, human-typeable code (avoids ambiguous chars).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (db.prepare("SELECT 1 FROM sessions WHERE join_code = ?").get(code));
  return code;
}

// Letters, digits, hyphens only — keeps join codes URL- and voice-friendly either way
// (auto-generated or a speaker's own human-readable choice, e.g. "TEAM-STANDUP").
const JOIN_CODE_PATTERN = /^[A-Z0-9-]{3,40}$/;

function normalizeJoinCode(raw) {
  return (raw || "").trim().toUpperCase();
}

function loadOwnedSession(sessionId, speakerId) {
  return db
    .prepare(
      `SELECT se.* FROM sessions se
       JOIN decks d ON d.id = se.deck_id
       WHERE se.id = ? AND d.speaker_id = ?`
    )
    .get(sessionId, speakerId);
}

// Create a session for a deck the speaker owns.
router.post("/for-deck/:deckId", requireSpeaker, (req, res) => {
  const deck = db
    .prepare("SELECT * FROM decks WHERE id = ? AND speaker_id = ?")
    .get(req.params.deckId, req.speaker.id);
  if (!deck) return res.status(404).json({ error: "Deck not found" });

  const id = nanoid();
  const joinCode = generateJoinCode();
  const name = (req.body?.name || "").trim() || null;
  db.prepare("INSERT INTO sessions (id, deck_id, name, join_code, status) VALUES (?, ?, ?, ?, 'open')").run(
    id,
    deck.id,
    name,
    joinCode
  );
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  res.status(201).json({ session: formatSession(session) });
});

// Speaker: get session detail (status, deck info) — used by session management screens.
router.get("/:sessionId", requireSpeaker, (req, res) => {
  const session = loadOwnedSession(req.params.sessionId, req.speaker.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const deck = db.prepare("SELECT * FROM decks WHERE id = ?").get(session.deck_id);
  res.json({ session: formatSession(session), deck });
});

// Speaker: toggle open/closed and/or rename.
router.patch("/:sessionId", requireSpeaker, (req, res) => {
  const session = loadOwnedSession(req.params.sessionId, req.speaker.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { status, name, joinCode } = req.body || {};
  if (status !== undefined && !["open", "closed"].includes(status)) {
    return res.status(400).json({ error: "status must be 'open' or 'closed'" });
  }
  const nextStatus = status ?? session.status;
  const nextName = name !== undefined ? (name || "").trim() || null : session.name;

  let nextJoinCode = session.join_code;
  if (joinCode !== undefined) {
    nextJoinCode = normalizeJoinCode(joinCode);
    if (!JOIN_CODE_PATTERN.test(nextJoinCode)) {
      return res.status(400).json({
        error: "Join code must be 3-40 characters: letters, digits, and hyphens only",
      });
    }
    if (nextJoinCode !== session.join_code) {
      const taken = db
        .prepare("SELECT 1 FROM sessions WHERE join_code = ? AND id != ?")
        .get(nextJoinCode, session.id);
      if (taken) return res.status(409).json({ error: "That join code is already in use" });
    }
  }

  db.prepare("UPDATE sessions SET status = ?, name = ?, join_code = ? WHERE id = ?").run(
    nextStatus,
    nextName,
    nextJoinCode,
    session.id
  );
  const updated = db.prepare("SELECT * FROM sessions WHERE id = ?").get(session.id);
  res.json({ session: formatSession(updated) });
});

// Speaker: delete their own session — cascades participants/comments/questions/prepared
// questions & responses via FK. The deck itself (and its slide images) is untouched.
router.delete("/:sessionId", requireSpeaker, (req, res) => {
  const session = loadOwnedSession(req.params.sessionId, req.speaker.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
  res.status(204).end();
});

// Shared feedback view: every comment in the session, flat, with slide + author + vote info.
// Used by both the speaker's review page and the participant's Comments tab — the client
// decides how to sort/group it (flat list vs. grouped by slide).
router.get("/:sessionId/comments", requireSessionAccess, (req, res) => {
  const session = req.sessionRow;
  const rows = db
    .prepare(
      `SELECT c.id, c.text, c.created_at, c.participant_id,
              s.id AS slideId, s.order_index AS slideOrderIndex, s.title AS slideTitle,
              s.image_path AS slideImagePath, s.is_general AS slideIsGeneral,
              p.display_name, p.join_order
       FROM comments c
       JOIN slides s ON s.id = c.slide_id
       JOIN participants p ON p.id = c.participant_id
       WHERE c.session_id = ?
       ORDER BY c.created_at ASC`
    )
    .all(session.id);

  const votesById = voteSummaries(
    "comment_votes",
    "comment_id",
    rows.map((r) => r.id),
    voterKeyFor(req)
  );

  const comments = rows.map((row) => ({
    id: row.id,
    text: row.text,
    created_at: row.created_at,
    authorParticipantId: row.participant_id,
    author: displayAuthor(row.display_name, row.join_order),
    slideId: row.slideId,
    slideOrderIndex: row.slideOrderIndex,
    slideTitle: row.slideTitle || null,
    slideImagePath: row.slideImagePath,
    slideIsGeneral: !!row.slideIsGeneral,
    votes: votesById.get(row.id),
  }));

  res.json({ session: formatSession(session), comments, canModerate: req.canModerate });
});

// Shared feedback view: every question in the session, flat, with slide + author + vote info.
router.get("/:sessionId/questions", requireSessionAccess, (req, res) => {
  const session = req.sessionRow;
  const rows = db
    .prepare(
      `SELECT q.id, q.text, q.asked_live, q.created_at, q.participant_id,
              s.id AS slideId, s.order_index AS slideOrderIndex, s.title AS slideTitle,
              s.image_path AS slideImagePath, s.is_general AS slideIsGeneral,
              p.display_name, p.join_order
       FROM questions q
       JOIN slides s ON s.id = q.slide_id
       JOIN participants p ON p.id = q.participant_id
       WHERE q.session_id = ?
       ORDER BY q.created_at ASC`
    )
    .all(session.id);

  const votesById = voteSummaries(
    "question_votes",
    "question_id",
    rows.map((r) => r.id),
    voterKeyFor(req)
  );
  const responsesById = responsesByQuestionId(rows.map((r) => r.id));

  const questions = rows.map((row) =>
    withQuestionResponses(
      {
        id: row.id,
        text: row.text,
        created_at: row.created_at,
        authorParticipantId: row.participant_id,
        author: displayAuthor(row.display_name, row.join_order),
        askedLive: !!row.asked_live,
        slideId: row.slideId,
        slideOrderIndex: row.slideOrderIndex,
        slideTitle: row.slideTitle || null,
        slideImagePath: row.slideImagePath,
        slideIsGeneral: !!row.slideIsGeneral,
        votes: votesById.get(row.id),
      },
      responsesById,
      req.participant?.id
    )
  );

  res.json({ session: formatSession(session), questions, canModerate: req.canModerate });
});

// Speaker review: Practice Q&A — each prepared question with every participant's response.
// One question can have many responses (one per participant who answered it).
router.get("/:sessionId/review/practice", requireSpeaker, (req, res) => {
  const session = loadOwnedSession(req.params.sessionId, req.speaker.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const questions = db
    .prepare("SELECT * FROM prepared_questions WHERE session_id = ? ORDER BY order_index")
    .all(session.id);

  const responseStmt = db.prepare(
    `SELECT r.asked_live, r.answer_note, r.updated_at, p.display_name, p.join_order
     FROM prepared_question_responses r
     JOIN participants p ON p.id = r.participant_id
     WHERE r.prepared_question_id = ?
     ORDER BY r.updated_at ASC`
  );

  const formatted = questions.map((q) => ({
    id: q.id,
    text: q.text,
    orderIndex: q.order_index,
    responses: responseStmt.all(q.id).map((row) => ({
      author: displayAuthor(row.display_name, row.join_order),
      askedLive: !!row.asked_live,
      answerNote: row.answer_note || "",
      updatedAt: row.updated_at,
    })),
  }));

  res.json({ session: formatSession(session), questions: formatted });
});

// Participant: list this session's slides (deck images), regardless of open/closed status.
router.get("/:sessionId/slides", requireParticipantOfSession, (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const slides = db
    .prepare("SELECT * FROM slides WHERE deck_id = ? ORDER BY order_index")
    .all(session.deck_id)
    .map(formatSlide);
  res.json({ session: formatSession(session), slides });
});

export default router;
