import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Layout from "../components/Layout";
import ReviewTabs from "../components/ReviewTabs";
import SlideRefHover from "../components/SlideRefHover";
import { possessive } from "../format";

export default function ReviewQuestionsPage() {
  const { deckId, sessionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  function reload() {
    api
      .reviewQuestions(sessionId)
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(reload, [sessionId]);

  async function removeQuestion(id) {
    if (!confirm("Delete this question?")) return;
    try {
      await api.deleteQuestionAsSpeaker(id);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Layout>
      <p>
        <Link to={`/decks/${deckId}/sessions/${sessionId}`}>← Back to session</Link>
      </p>
      <h1>Question Bank</h1>
      <p className="muted small">
        Every question collected in the session, with its slide reference, author, and how it
        was answered live.
      </p>
      <ReviewTabs deckId={deckId} sessionId={sessionId} />

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="spinner-note">Loading…</p>}

      {data && data.questions.length === 0 && (
        <div className="card">
          <p className="muted">No questions collected yet.</p>
        </div>
      )}

      {data && data.questions.length > 0 && (
        <div className="stack">
          {data.questions.map((q) => (
            <div className="item-entry" key={q.id}>
              <div className="meta row between">
                <span>
                  {q.author} ·{" "}
                  <SlideRefHover
                    slide={{ imagePath: q.slideImagePath, isGeneral: q.slideIsGeneral }}
                  >
                    {q.slideIsGeneral ? "General" : `Slide ${q.slideOrderIndex + 1}`}
                    {q.slideTitle && !q.slideIsGeneral ? ` — ${q.slideTitle}` : ""}
                  </SlideRefHover>{" "}
                  · {new Date(q.created_at).toLocaleString()}
                </span>
                <button className="ghost small" onClick={() => removeQuestion(q.id)} title="Delete">
                  ✕
                </button>
              </div>
              <div style={{ marginBottom: "0.4rem" }}>{q.text}</div>
              <div className="row small muted">
                <span className={`badge ${q.askedLive ? "open" : "closed"}`}>
                  {q.askedLive ? "Asked live" : "Not asked live"}
                </span>
              </div>
              {q.answerNote && (
                <div className="small" style={{ marginTop: "0.4rem" }}>
                  <span className="muted">{possessive(q.author)} note on the answer: </span>
                  {q.answerNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
