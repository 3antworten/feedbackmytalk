import { useEffect, useRef, useState } from "react";

const AUTOSAVE_DELAY_MS = 900;

// Own local state so the checkbox/textarea respond instantly (optimistic), independent of
// the round-trip to persist the change. The note auto-saves shortly after the author stops
// typing. The note is only shown once the question has been marked as asked live. Follows
// the same header/content/footer template as the slide questions (QuestionItem).
export default function QuestionRecapItem({ question, onUpdate, header, disabled = false }) {
  const [askedLive, setAskedLive] = useState(question.askedLive);
  const [answerNote, setAnswerNote] = useState(question.answerNote || "");
  const debounceRef = useRef(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  async function handleAskedLiveChange(e) {
    const next = e.target.checked;
    setAskedLive(next);
    try {
      await onUpdate({ askedLive: next });
    } catch {
      // best-effort; the checkbox already reflects the user's intent
    }
  }

  async function saveNote(nextNote) {
    clearTimeout(debounceRef.current);
    try {
      await onUpdate({ answerNote: nextNote });
    } catch {
      // best-effort; auto-save will retry on the next keystroke
    }
  }

  function handleNoteChange(e) {
    const next = e.target.value;
    setAnswerNote(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(next), AUTOSAVE_DELAY_MS);
  }

  return (
    <div className="item-entry stack">
      {header}
      <div className="feedback-content">{question.text}</div>
      <div className="feedback-footer row">
        <label className="checkbox-row small">
          <input type="checkbox" checked={askedLive} disabled={disabled} onChange={handleAskedLiveChange} />
          Asked live
        </label>
      </div>
      {askedLive && (
        <label className="feedback-note small">
          <textarea
            rows={2}
            value={answerNote}
            onChange={handleNoteChange}
            disabled={disabled}
            placeholder="Feedback the answer: well explained or expected more?"
          />
        </label>
      )}
    </div>
  );
}
