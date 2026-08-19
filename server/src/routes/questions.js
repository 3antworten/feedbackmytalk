import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { voterKeyFor, voteSummary, voteSummaries, castVote } from "../votes.js";
import { responsesByQuestionId, withQuestionResponses, upsertQuestionResponse } from "../questionResponses.js";
// req.speaker and req.participant are already populated by the global
// attachSpeaker/attachParticipant middleware in index.js.

function formatAuthored(row) {
  const { display_name, join_order, participant_id, asked_live, ...rest } = row;
  return {
    ...rest,
    authorParticipantId: participant_id,
    askedLive: !!asked_live,
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
      `SELECT q.id, q.text, q.asked_live, q.created_at, q.participant_id, p.display_name, p.join_order
       FROM questions q JOIN participants p ON p.id = q.participant_id
       WHERE q.slide_id = ? ORDER BY q.created_at ASC`
    )
    .all(slide.id);
  const voterKey = voterKeyFor(req);
  const votesById = voteSummaries(
    "question_votes",
    "question_id",
    questions.map((q) => q.id),
    voterKey
  );
  const responsesById = responsesByQuestionId(questions.map((q) => q.id));
  res.json({
    session: { id: session.id, status: session.status },
    questions: questions.map((row) =>
      withQuestionResponses(
        { ...formatAuthored(row), votes: votesById.get(row.id) },
        responsesById,
        req.participant?.id
      )
    ),
  });
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
      `SELECT q.id, q.text, q.asked_live, q.created_at, q.participant_id, p.display_name, p.join_order
       FROM questions q JOIN participants p ON p.id = q.participant_id WHERE q.id = ?`
    )
    .get(id);
  res.status(201).json({
    question: {
      ...formatAuthored(row),
      votes: voteSummary("question_votes", "question_id", id, voterKeyFor(req)),
      myAnswerNote: "",
      responses: [],
    },
  });
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

// Update askedLive — any participant of the session may toggle it (it's a shared fact about
// whether the question got asked live, not any one person's opinion) while the session is open.
questionByIdRouter.patch("/:id", (req, res) => {
  const { question, session } = loadWithSession(req.params.id);
  if (!question) return res.status(404).json({ error: "Question not found" });
  if (!req.participant || req.participant.session_id !== session.id) {
    return res.status(403).json({ error: "Only session participants can update this question" });
  }
  if (session.status !== "open") {
    return res.status(403).json({ error: "Session is closed; questions can no longer be updated" });
  }

  const askedLive = req.body?.askedLive;
  if (typeof askedLive !== "boolean") {
    return res.status(400).json({ error: "askedLive must be a boolean" });
  }

  db.prepare("UPDATE questions SET asked_live = ? WHERE id = ?").run(askedLive ? 1 : 0, question.id);
  const row = db
    .prepare(
      `SELECT q.id, q.text, q.asked_live, q.created_at, q.participant_id, p.display_name, p.join_order
       FROM questions q JOIN participants p ON p.id = q.participant_id WHERE q.id = ?`
    )
    .get(question.id);
  const responsesById = responsesByQuestionId([question.id]);
  res.json({
    question: withQuestionResponses(
      { ...formatAuthored(row), votes: voteSummary("question_votes", "question_id", question.id, voterKeyFor(req)) },
      responsesById,
      req.participant.id
    ),
  });
});

// Update the requesting participant's own note on how the question was answered — everyone
// gets their own row here, regardless of who asked the question or who marked it asked live.
questionByIdRouter.patch("/:id/response", (req, res) => {
  const { question, session } = loadWithSession(req.params.id);
  if (!question) return res.status(404).json({ error: "Question not found" });
  if (!req.participant || req.participant.session_id !== session.id) {
    return res.status(403).json({ error: "Only session participants can leave a note" });
  }
  if (session.status !== "open") {
    return res.status(403).json({ error: "Session is closed; notes can no longer be edited" });
  }

  const answerNote = typeof req.body?.answerNote === "string" ? req.body.answerNote.slice(0, 2000) : "";
  upsertQuestionResponse(question.id, req.participant.id, answerNote);
  res.json({ answerNote });
});

// Vote: any participant of the session, or the owning speaker, may cast/change/remove a vote,
// while the session is still open.
questionByIdRouter.put("/:id/vote", (req, res) => {
  const { question, session } = loadWithSession(req.params.id);
  if (!question) return res.status(404).json({ error: "Question not found" });

  const isParticipantOfSession = req.participant && req.participant.session_id === session.id;
  const isOwningSpeaker =
    req.speaker &&
    db.prepare("SELECT 1 FROM decks WHERE id = ? AND speaker_id = ?").get(session.deck_id, req.speaker.id);
  if (!isParticipantOfSession && !isOwningSpeaker) {
    return res.status(403).json({ error: "Not authorized to vote on this question" });
  }
  if (session.status !== "open") {
    return res.status(403).json({ error: "Session is closed; voting is no longer possible" });
  }

  try {
    castVote("question_votes", "question_id", question.id, voterKeyFor(req), req.body?.value);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
  res.json({ votes: voteSummary("question_votes", "question_id", question.id, voterKeyFor(req)) });
});

export default { questionsBySlideRouter, questionByIdRouter };
