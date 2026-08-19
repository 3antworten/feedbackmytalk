import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";

function loadOwnedSession(sessionId, speakerId) {
  return db
    .prepare(
      `SELECT se.* FROM sessions se
       JOIN decks d ON d.id = se.deck_id
       WHERE se.id = ? AND d.speaker_id = ?`
    )
    .get(sessionId, speakerId);
}

function formatForSpeaker(row) {
  return { id: row.id, text: row.text, orderIndex: row.order_index };
}

function formatForParticipant(row) {
  return {
    id: row.id,
    text: row.text,
    orderIndex: row.order_index,
    askedLive: !!row.asked_live,
    answerNote: row.answer_note || "",
  };
}

// Mounted at /api/sessions/:sessionId/prepared-questions.
// Dual-purpose: the owning speaker manages the list; a joined participant reads it merged
// with their own private response.
export const preparedQuestionsBySessionRouter = Router({ mergeParams: true });

preparedQuestionsBySessionRouter.get("/", (req, res) => {
  const { sessionId } = req.params;

  if (req.speaker) {
    const session = loadOwnedSession(sessionId, req.speaker.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const rows = db
      .prepare("SELECT * FROM prepared_questions WHERE session_id = ? ORDER BY order_index")
      .all(sessionId);
    return res.json({ questions: rows.map(formatForSpeaker) });
  }

  if (req.participant && req.participant.session_id === sessionId) {
    const rows = db
      .prepare(
        `SELECT pq.*, r.asked_live, r.answer_note
         FROM prepared_questions pq
         LEFT JOIN prepared_question_responses r
           ON r.prepared_question_id = pq.id AND r.participant_id = ?
         WHERE pq.session_id = ? ORDER BY pq.order_index`
      )
      .all(req.participant.id, sessionId);
    return res.json({ questions: rows.map(formatForParticipant) });
  }

  res.status(401).json({ error: "Not authorized" });
});

preparedQuestionsBySessionRouter.post("/", (req, res) => {
  if (!req.speaker) return res.status(401).json({ error: "Not authenticated" });
  const session = loadOwnedSession(req.params.sessionId, req.speaker.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Question text is required" });

  const orderIndex = db
    .prepare("SELECT COUNT(*) AS n FROM prepared_questions WHERE session_id = ?")
    .get(session.id).n;
  const id = nanoid();
  db.prepare(
    "INSERT INTO prepared_questions (id, session_id, text, order_index) VALUES (?, ?, ?, ?)"
  ).run(id, session.id, text, orderIndex);
  const row = db.prepare("SELECT * FROM prepared_questions WHERE id = ?").get(id);
  res.status(201).json({ question: formatForSpeaker(row) });
});

// Mounted at /api/prepared-questions/:id — speaker-only delete (moderation of their own list).
export const preparedQuestionByIdRouter = Router();

preparedQuestionByIdRouter.delete("/:id", (req, res) => {
  if (!req.speaker) return res.status(401).json({ error: "Not authenticated" });
  const pq = db.prepare("SELECT * FROM prepared_questions WHERE id = ?").get(req.params.id);
  if (!pq) return res.status(404).json({ error: "Question not found" });
  const session = loadOwnedSession(pq.session_id, req.speaker.id);
  if (!session) return res.status(403).json({ error: "Not authorized" });
  db.prepare("DELETE FROM prepared_questions WHERE id = ?").run(pq.id);
  res.status(204).end();
});

// Mounted at /api/sessions/:sessionId/prepared-questions/:id/response — participant upserts
// their own askedLive/answerNote against a speaker-prepared question.
export const preparedQuestionResponseRouter = Router({ mergeParams: true });

preparedQuestionResponseRouter.patch("/", (req, res) => {
  const { sessionId, id } = req.params;
  if (!req.participant || req.participant.session_id !== sessionId) {
    return res.status(401).json({ error: "Not joined to this session" });
  }
  const pq = db.prepare("SELECT * FROM prepared_questions WHERE id = ? AND session_id = ?").get(id, sessionId);
  if (!pq) return res.status(404).json({ error: "Question not found" });
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (session.status !== "open") {
    return res.status(403).json({ error: "Session is closed; responses can no longer be edited" });
  }

  const existing = db
    .prepare("SELECT * FROM prepared_question_responses WHERE prepared_question_id = ? AND participant_id = ?")
    .get(pq.id, req.participant.id);

  const askedLive = req.body?.askedLive;
  const answerNote = req.body?.answerNote;
  const nextAskedLive =
    typeof askedLive === "boolean" ? (askedLive ? 1 : 0) : (existing?.asked_live ?? 0);
  const nextAnswerNote =
    typeof answerNote === "string" ? answerNote.slice(0, 2000) : (existing?.answer_note ?? "");

  if (existing) {
    db.prepare(
      "UPDATE prepared_question_responses SET asked_live = ?, answer_note = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(nextAskedLive, nextAnswerNote, existing.id);
  } else {
    db.prepare(
      `INSERT INTO prepared_question_responses (id, prepared_question_id, participant_id, asked_live, answer_note)
       VALUES (?, ?, ?, ?, ?)`
    ).run(nanoid(), pq.id, req.participant.id, nextAskedLive, nextAnswerNote);
  }

  const row = db
    .prepare(
      `SELECT pq.*, r.asked_live, r.answer_note FROM prepared_questions pq
       LEFT JOIN prepared_question_responses r
         ON r.prepared_question_id = pq.id AND r.participant_id = ?
       WHERE pq.id = ?`
    )
    .get(req.participant.id, pq.id);
  res.json({ question: formatForParticipant(row) });
});
