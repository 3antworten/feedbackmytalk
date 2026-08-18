import { useEffect, useState } from "react";
import { api } from "../api";

// Speaker-side manager for the practice question list participants can rehearse against.
export default function PreparedQuestionsAdmin({ sessionId }) {
  const [questions, setQuestions] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function reload() {
    api
      .listPreparedQuestions(sessionId)
      .then((d) => setQuestions(d.questions))
      .catch((e) => setError(e.message));
  }

  useEffect(reload, [sessionId]);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.addPreparedQuestion(sessionId, text.trim());
      setText("");
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await api.deletePreparedQuestion(id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>Practice Q&amp;A questions</h2>
      <p className="muted small">
        Questions you anticipate being asked. Participants get a &quot;Practice Q&amp;A&quot;
        tab to rehearse against this list — marking which they&apos;d ask and noting how well
        each answer might land.
      </p>

      <form className="row" onSubmit={add}>
        <input
          type="text"
          placeholder="Add a question you expect to be asked…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" disabled={busy || !text.trim()}>
          Add
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {questions === null && <p className="muted small">Loading…</p>}
      {questions?.length === 0 && (
        <p className="muted small">None yet — this tab stays hidden for participants until you add one.</p>
      )}
      <div className="stack">
        {questions?.map((q) => (
          <div className="item-entry row between" key={q.id}>
            <span>{q.text}</span>
            <button className="ghost small" onClick={() => remove(q.id)} title="Delete">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
