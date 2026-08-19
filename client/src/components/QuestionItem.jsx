import { useEffect, useRef, useState } from "react";
import VoteWidget from "./VoteWidget";
import SlideRefHover from "./SlideRefHover";
import { slideLabel } from "../format";

const AUTOSAVE_DELAY_MS = 900;

function slideOf(item) {
  return {
    imagePath: item.slideImagePath,
    isGeneral: item.slideIsGeneral,
    title: item.slideTitle,
    orderIndex: item.slideOrderIndex,
  };
}

// Renders one question row. Asked-live is a shared fact anyone can toggle; once set, every
// participant gets their own note on how it landed (auto-saved) — not just the author or
// whoever ticked the box. The speaker never gets these controls: just a read-only badge and
// the list of notes participants left.
export default function QuestionItem({
  question,
  showSlideRef,
  isOwn,
  canModerate,
  canDeleteOwn = true,
  onVote,
  onDelete,
  onToggleAskedLive,
  onSaveNote,
}) {
  const [answerNote, setAnswerNote] = useState(question.myAnswerNote || "");
  const debounceRef = useRef(null);

  useEffect(() => {
    setAnswerNote(question.myAnswerNote || "");
  }, [question.id, question.myAnswerNote]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function handleNoteChange(e) {
    const next = e.target.value;
    setAnswerNote(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSaveNote(question.id, next), AUTOSAVE_DELAY_MS);
  }

  const canDelete = canModerate || (isOwn && canDeleteOwn);

  return (
    <div className={`item-entry${isOwn ? " own" : ""}`}>
      <div className="meta row between">
        <span>
          {isOwn ? "You" : question.author}
          {showSlideRef && (
            <>
              {" · "}
              <SlideRefHover slide={slideOf(question)}>{slideLabel(slideOf(question))}</SlideRefHover>
            </>
          )}
          {" · "}
          {new Date(question.created_at).toLocaleString()}
        </span>
        {!canModerate && canDelete && (
          <button className="ghost small" onClick={() => onDelete(question.id)} title="Delete">
            ✕
          </button>
        )}
      </div>
      <div style={{ marginBottom: "0.4rem" }}>{question.text}</div>

      {canModerate ? (
        <div className="row between" style={{ marginBottom: "0.4rem" }}>
          <span className={`badge ${question.askedLive ? "open" : "closed"}`}>
            {question.askedLive ? "Asked live" : "Not asked live"}
          </span>
          {canDelete && (
            <button className="ghost small" onClick={() => onDelete(question.id)} title="Delete">
              ✕
            </button>
          )}
        </div>
      ) : (
        <label className="checkbox-row small" style={{ marginBottom: "0.4rem" }}>
          <input
            type="checkbox"
            checked={question.askedLive}
            onChange={(e) => onToggleAskedLive(question.id, e.target.checked)}
          />
          Asked live
        </label>
      )}

      {question.askedLive && canModerate && (
        <div className="stack small" style={{ marginBottom: "0.4rem" }}>
          {question.responses?.length ? (
            question.responses.map((r, i) => (
              <div key={i} className="muted">
                <strong>{r.author}: </strong>
                {r.answerNote}
              </div>
            ))
          ) : (
            <p className="muted small" style={{ margin: 0 }}>
              No participant has left a note yet.
            </p>
          )}
        </div>
      )}

      {question.askedLive && !canModerate && (
        <label className="small" style={{ display: "block", marginBottom: "0.4rem" }}>
          Your note on how it was answered
          <textarea
            rows={2}
            value={answerNote}
            onChange={handleNoteChange}
            placeholder="e.g. answered well, expected more depth…"
          />
        </label>
      )}

      <VoteWidget
        votes={question.votes}
        onVote={(value) => onVote(question.id, value)}
        interactive={!canModerate}
        hideEmpty={canModerate}
      />
    </div>
  );
}
