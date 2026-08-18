import { useState } from "react";

// Own local state so the checkbox/textarea respond instantly (optimistic), independent of
// the round-trip to persist the change. The "asked live" checkbox saves as soon as it's
// toggled; the free-text note needs an explicit Save so the participant gets a clear
// confirmation the system actually kept their note.
export default function QuestionRecapItem({ question, onUpdate, header }) {
  const [askedLive, setAskedLive] = useState(question.askedLive);
  const [answerNote, setAnswerNote] = useState(question.answerNote || "");
  const [noteDirty, setNoteDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleAskedLiveChange(e) {
    const next = e.target.checked;
    setAskedLive(next);
    try {
      await onUpdate({ askedLive: next });
    } catch {
      // best-effort; the checkbox already reflects the user's intent
    }
  }

  async function saveNote() {
    setSaving(true);
    try {
      await onUpdate({ answerNote });
      setNoteDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="item-entry stack">
      {header}
      <div>{question.text}</div>
      <label className="checkbox-row small">
        <input type="checkbox" checked={askedLive} onChange={handleAskedLiveChange} />
        Asked live
      </label>
      <label className="small">
        Your note on how it was answered
        <textarea
          rows={2}
          value={answerNote}
          onChange={(e) => {
            setAnswerNote(e.target.value);
            setNoteDirty(true);
            setJustSaved(false);
          }}
          placeholder="e.g. answered well, expected more depth…"
        />
      </label>
      <div className="row">
        <button type="button" className="secondary small" disabled={!noteDirty || saving} onClick={saveNote}>
          {saving ? "Saving…" : "Save note"}
        </button>
        {justSaved && <span className="small saved-flash">✓ Saved</span>}
      </div>
    </div>
  );
}
