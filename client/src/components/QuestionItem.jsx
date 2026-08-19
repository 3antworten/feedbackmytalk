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

// Renders one question row using the same header/content/footer template as comments.
// The footer additionally carries the "asked live" control (checkbox for participants,
// read-only badge for the speaker), left of the vote widget. Once asked live, a reply-like
// note section appears below the footer — every participant gets their own editable note;
// the speaker only ever sees a read-only list, and only when someone actually left one.
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
        {canDelete && (
          <button className="ghost small" onClick={() => onDelete(question.id)} title="Delete">
            ✕
          </button>
        )}
      </div>
      <div className="feedback-content">{question.text}</div>
      <div className="feedback-footer row between">
        <VoteWidget
          votes={question.votes}
          onVote={(value) => onVote(question.id, value)}
          interactive={!canModerate}
          hideEmpty={canModerate}
        />
        {canModerate ? (
          <span className={`badge ${question.askedLive ? "open" : "closed"}`}>
            {question.askedLive ? "Asked live" : "Not asked live"}
          </span>
        ) : (
          <label className="checkbox-row small">
            <input
              type="checkbox"
              checked={question.askedLive}
              onChange={(e) => onToggleAskedLive(question.id, e.target.checked)}
            />
            Asked live
          </label>
        )}
      </div>

      {question.askedLive && canModerate && question.responses?.length > 0 && (
        <div className="feedback-note stack small">
          {question.responses.map((r, i) => (
            <div key={i}>
              <strong>{r.author}: </strong>
              {r.answerNote}
            </div>
          ))}
        </div>
      )}

      {question.askedLive && !canModerate && (
        <label className="feedback-note small">
          <textarea
            rows={2}
            value={answerNote}
            onChange={handleNoteChange}
            placeholder="Feedback the answer: well explained or expected more?"
          />
        </label>
      )}
    </div>
  );
}
