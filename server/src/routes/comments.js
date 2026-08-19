import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { voterKeyFor, voteSummary, voteSummaries, castVote } from "../votes.js";
// req.speaker and req.participant are already populated by the global
// attachSpeaker/attachParticipant middleware in index.js.

function formatAuthored(row) {
  const { display_name, join_order, participant_id, ...rest } = row;
  return {
    ...rest,
    authorParticipantId: participant_id,
    author: display_name && display_name.trim() ? display_name.trim() : `Anonymous #${join_order}`,
  };
}

function getSlideAndSession(slideId, sessionId) {
  const slide = db.prepare("SELECT * FROM slides WHERE id = ?").get(slideId);
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!slide || !session || slide.deck_id !== session.deck_id) return {};
  return { slide, session };
}

// Mounted at /api/sessions/:sessionId/slides/:slideId/comments (mergeParams).
export const commentsBySlideRouter = Router({ mergeParams: true });

commentsBySlideRouter.get("/", (req, res) => {
  const { slide, session } = getSlideAndSession(req.params.slideId, req.params.sessionId);
  if (!slide) return res.status(404).json({ error: "Slide not found in this session" });
  const comments = db
    .prepare(
      `SELECT c.id, c.text, c.created_at, c.participant_id, p.display_name, p.join_order
       FROM comments c JOIN participants p ON p.id = c.participant_id
       WHERE c.slide_id = ? ORDER BY c.created_at ASC`
    )
    .all(slide.id);
  const voterKey = voterKeyFor(req);
  const votesById = voteSummaries(
    "comment_votes",
    "comment_id",
    comments.map((c) => c.id),
    voterKey
  );
  res.json({
    session: { id: session.id, status: session.status },
    comments: comments.map((row) => ({ ...formatAuthored(row), votes: votesById.get(row.id) })),
  });
});

commentsBySlideRouter.post("/", (req, res) => {
  const { slide, session } = getSlideAndSession(req.params.slideId, req.params.sessionId);
  if (!slide) return res.status(404).json({ error: "Slide not found in this session" });
  if (!req.participant || req.participant.session_id !== session.id) {
    return res.status(401).json({ error: "Not joined to this session" });
  }
  if (session.status !== "open") {
    return res.status(403).json({ error: "Session is closed; comments can no longer be added" });
  }
  const text = (req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Comment text is required" });

  const id = nanoid();
  db.prepare(
    "INSERT INTO comments (id, session_id, slide_id, participant_id, text) VALUES (?, ?, ?, ?, ?)"
  ).run(id, session.id, slide.id, req.participant.id, text);
  const row = db
    .prepare(
      `SELECT c.id, c.text, c.created_at, c.participant_id, p.display_name, p.join_order
       FROM comments c JOIN participants p ON p.id = c.participant_id WHERE c.id = ?`
    )
    .get(id);
  res.status(201).json({ comment: { ...formatAuthored(row), votes: voteSummary("comment_votes", "comment_id", id, voterKeyFor(req)) } });
});

// Mounted at /api/comments/:id — deletion by author (while open) or owning speaker (moderation, any time).
export const commentByIdRouter = Router();

commentByIdRouter.delete("/:id", (req, res) => {
  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(comment.session_id);

  const isAuthor = req.participant && req.participant.id === comment.participant_id;
  const isOwningSpeaker =
    req.speaker &&
    db.prepare("SELECT 1 FROM decks WHERE id = ? AND speaker_id = ?").get(session.deck_id, req.speaker.id);

  if (isOwningSpeaker) {
    db.prepare("DELETE FROM comments WHERE id = ?").run(comment.id);
    return res.status(204).end();
  }
  if (isAuthor) {
    if (session.status !== "open") {
      return res.status(403).json({ error: "Session is closed; you can no longer delete comments" });
    }
    db.prepare("DELETE FROM comments WHERE id = ?").run(comment.id);
    return res.status(204).end();
  }
  res.status(403).json({ error: "Not authorized to delete this comment" });
});

// Vote: any participant of the session, or the owning speaker, may cast/change/remove a vote.
commentByIdRouter.put("/:id/vote", (req, res) => {
  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(comment.session_id);

  const isParticipantOfSession = req.participant && req.participant.session_id === session.id;
  const isOwningSpeaker =
    req.speaker &&
    db.prepare("SELECT 1 FROM decks WHERE id = ? AND speaker_id = ?").get(session.deck_id, req.speaker.id);
  if (!isParticipantOfSession && !isOwningSpeaker) {
    return res.status(403).json({ error: "Not authorized to vote on this comment" });
  }

  try {
    castVote("comment_votes", "comment_id", comment.id, voterKeyFor(req), req.body?.value);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
  res.json({ votes: voteSummary("comment_votes", "comment_id", comment.id, voterKeyFor(req)) });
});

export default { commentsBySlideRouter, commentByIdRouter };
