import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
// req.speaker and req.participant are already populated by the global
// attachSpeaker/attachParticipant middleware in index.js.

function formatAuthored(row) {
  const { display_name, join_order, participant_id, asked_live, answer_note, ...rest } = row;
  return {
    ...rest,
    authorParticipantId: participant_id,
    askedLive: !!asked_live,
    answerNote: answer_note || "",
    author: display_name && display_name.trim() ? display_name.trim() : `Anonymous #${join_order}`,
  };
}

function getSlideAndSession(slideId, sessionId) {
  const slide = db.prepare("SELECT * FROM slides WHERE id = ?").get(slideId);
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!slide || !session || slide.deck_id !== session.deck_id) return {};
  return { slide, session };
}

// Mounted at /api/sessions/:sessionId/slides/:slideId/questions (mergeParams).
export const questionsBySlideRouter = Router({ mergeParams: true });

questionsBySlideRouter.get("/", (req, res) => {
  const { slide, session } = getSlideAndSession(req.params.slideId, req.params.sessionId);
  if (!slide) return res.status(404).json({ error: "Slide not found in this session" });
  const questions = db
    .prepare(
      `SELECT q.id, q.text, q.asked_live, q.answer_note, q.created_at, q.participant_id, p.display_name, p.join_order
       FROM questions q JOIN participants p ON p.id = q.participant_id
       WHERE q.slide_id = ? ORDER BY q.created_at ASC`
    )
    .all(slide.id);
  res.json({ session: { id: session.id, status: session.status }, questions: questions.map(formatAuthored) });
});

questionsBySlideRouter.post("/", (req, res) => {
  const { slide, session } = getSlideAndSession(req.params.slideId, req.params.sessionId);
  if (!slide) return res.status(404).json({ error: "Slide not found in this session" });
  if (!req.participant || req.participant.session_id !== session.id) {
    return res.status(401).json({ error: "Not joined to this session" });
  }
  if (session.status !== "open") {
    return res.status(403).json({ error: "Session is closed; questions can no longer be added" });
  }
  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Question text is required" });

  const id = nanoid();
  db.prepare(
    "INSERT INTO questions (id, session_id, slide_id, participant_id, text) VALUES (?, ?, ?, ?, ?)"
  ).run(id, session.id, slide.id, req.participant.id, text);
  const row = db
    .prepare(
      `SELECT q.id, q.text, q.asked_live, q.answer_note, q.created_at, q.participant_id, p.display_name, p.join_order
       FROM questions q JOIN participants p ON p.id = q.participant_id WHERE q.id = ?`
    )
    .get(id);
  res.status(201).json({ question: formatAuthored(row) });
});

// Mounted at /api/questions/:id.
export const questionByIdRouter = Router();

function loadWithSession(id) {
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
  if (!question) return {};
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(question.session_id);
  return { question, session };
}

// Delete: author (while session open) or owning speaker (moderation, any time).
questionByIdRouter.delete("/:id", (req, res) => {
  const { question, session } = loadWithSession(req.params.id);
  if (!question) return res.status(404).json({ error: "Question not found" });

  const isAuthor = req.participant && req.participant.id === question.participant_id;
  const isOwningSpeaker =
    req.speaker &&
    db.prepare("SELECT 1 FROM decks WHERE id = ? AND speaker_id = ?").get(session.deck_id, req.speaker.id);

  if (isOwningSpeaker) {
    db.prepare("DELETE FROM questions WHERE id = ?").run(question.id);
    return res.status(204).end();
  }
  if (isAuthor) {
    if (session.status !== "open") {
      return res.status(403).json({ error: "Session is closed; you can no longer delete questions" });
    }
    db.prepare("DELETE FROM questions WHERE id = ?").run(question.id);
    return res.status(204).end();
  }
  res.status(403).json({ error: "Not authorized to delete this question" });
});

// Update askedLive / answerNote — author only, editable regardless of session open/closed status.
questionByIdRouter.patch("/:id", (req, res) => {
  const { question } = loadWithSession(req.params.id);
  if (!question) return res.status(404).json({ error: "Question not found" });
  if (!req.participant || req.participant.id !== question.participant_id) {
    return res.status(403).json({ error: "Only the author can edit this question" });
  }

  const askedLive = req.body?.askedLive;
  const answerNote = req.body?.answerNote;
  const nextAskedLive = typeof askedLive === "boolean" ? (askedLive ? 1 : 0) : question.asked_live;
  const nextAnswerNote = typeof answerNote === "string" ? answerNote.slice(0, 2000) : question.answer_note;

  db.prepare("UPDATE questions SET asked_live = ?, answer_note = ? WHERE id = ?").run(
    nextAskedLive,
    nextAnswerNote,
    question.id
  );
  const row = db
    .prepare(
      `SELECT q.id, q.text, q.asked_live, q.answer_note, q.created_at, q.participant_id, p.display_name, p.join_order
       FROM questions q JOIN participants p ON p.id = q.participant_id WHERE q.id = ?`
    )
    .get(question.id);
  res.json({ question: formatAuthored(row) });
});

export default { questionsBySlideRouter, questionByIdRouter };
