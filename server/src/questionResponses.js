import { nanoid } from "nanoid";
import { db } from "./db/index.js";
import { displayAuthor } from "./format.js";

// Loads every participant's answer-note response for a batch of questions, grouped by
// question id — used both to build the speaker's read-only "how it landed" list and to
// pick out the requesting participant's own note to prefill their editable textarea.
export function responsesByQuestionId(questionIds) {
  const map = new Map(questionIds.map((id) => [id, []]));
  if (questionIds.length === 0) return map;
  const placeholders = questionIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT r.question_id AS questionId, r.participant_id AS participantId, r.answer_note, r.updated_at,
              p.display_name, p.join_order
       FROM question_responses r
       JOIN participants p ON p.id = r.participant_id
       WHERE r.question_id IN (${placeholders})
       ORDER BY r.updated_at ASC`
    )
    .all(...questionIds);
  for (const row of rows) {
    map.get(row.questionId).push({
      participantId: row.participantId,
      answerNote: row.answer_note,
      updatedAt: row.updated_at,
      author: displayAuthor(row.display_name, row.join_order),
    });
  }
  return map;
}

// Attaches `myAnswerNote` (the requesting participant's own note, if any) and `responses`
// (every other participant's non-empty note, for the speaker's read-only view) to a row.
export function withQuestionResponses(row, responsesById, viewerParticipantId) {
  const all = responsesById.get(row.id) || [];
  const mine = viewerParticipantId ? all.find((r) => r.participantId === viewerParticipantId) : null;
  return {
    ...row,
    myAnswerNote: mine?.answerNote || "",
    responses: all
      .filter((r) => r.answerNote)
      .map((r) => ({ author: r.author, answerNote: r.answerNote, updatedAt: r.updatedAt })),
  };
}

export function upsertQuestionResponse(questionId, participantId, answerNote) {
  db.prepare(
    `INSERT INTO question_responses (id, question_id, participant_id, answer_note, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(question_id, participant_id)
     DO UPDATE SET answer_note = excluded.answer_note, updated_at = datetime('now')`
  ).run(nanoid(), questionId, participantId, answerNote);
}
