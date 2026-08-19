import { useEffect, useRef, useState } from "react";

const AUTOSAVE_DELAY_MS = 900;

// Own local state so the checkbox/textarea respond instantly (optimistic), independent of
// the round-trip to persist the change. The note auto-saves shortly after the author stops
// typing. The note is only shown once the question has been marked as asked live.
export default function QuestionRecapItem({ question, onUpdate, header }) {
  const [askedLive, setAskedLive] = useState(question.askedLive);
  const [answerNote, setAnswerNote] = useState(question.answerNote || "");
  const [justSaved, setJustSaved] = useState(false);
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
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      // best-effort; auto-save will retry on the next keystroke
    }
  }

  function handleNoteChange(e) {
    const next = e.target.value;
    setAnswerNote(next);
    setJustSaved(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(next), AUTOSAVE_DELAY_MS);
  }

  return (
    <div className="item-entry stack">
      {header}
      <div>{question.text}</div>
      <label className="checkbox-row small">
        <input type="checkbox" checked={askedLive} onChange={handleAskedLiveChange} />
        Asked live
      </label>
      {askedLive && (
        <label className="small">
          Your note on how it was answered
          <textarea
            rows={2}
            value={answerNote}
            onChange={handleNoteChange}
            placeholder="e.g. answered well, expected more depth…"
          />
          {justSaved && <span className="small saved-flash"> ✓ Saved</span>}
        </label>
      )}
    </div>
  );
}
