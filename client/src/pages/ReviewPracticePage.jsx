import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Layout from "../components/Layout";
import ReviewTabs from "../components/ReviewTabs";

export default function ReviewPracticePage() {
  const { deckId, sessionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .reviewPractice(sessionId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [sessionId]);

  return (
    <Layout>
      <p>
        <Link to={`/decks/${deckId}/sessions/${sessionId}`}>← Back to session</Link>
      </p>
      <h1>Practice Q&amp;A</h1>
      <p className="muted small">
        Your prepared questions and how participants responded — whether they planned to ask
        it live, and their private note on how the answer landed. Each question can have
        responses from multiple participants.
      </p>
      <ReviewTabs deckId={deckId} sessionId={sessionId} />

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="spinner-note">Loading…</p>}

      {data && data.questions.length === 0 && (
        <div className="card">
          <p className="muted">
            You haven&apos;t added any practice questions for this session yet — add some from the{" "}
            <Link to={`/decks/${deckId}/sessions/${sessionId}`}>Manage</Link> tab.
          </p>
        </div>
      )}

      <div className="stack">
        {data?.questions.map((q) => (
          <div className="card stack" key={q.id}>
            <strong>{q.text}</strong>
            {q.responses.length === 0 && (
              <p className="muted small" style={{ margin: 0 }}>
                No participant has responded to this one yet.
              </p>
            )}
            {q.responses.length > 0 && (
              <div className="stack">
                {q.responses.map((r, i) => (
                  <div className="item-entry" key={i}>
                    <div className="meta row between">
                      <span>
                        {r.author} · {new Date(r.updatedAt).toLocaleString()}
                      </span>
                      <span className={`badge ${r.askedLive ? "open" : "closed"}`}>
                        {r.askedLive ? "Asked live" : "Not asked live"}
                      </span>
                    </div>
                    {r.answerNote && <div>{r.answerNote}</div>}
                    {!r.answerNote && <div className="muted small">No note left.</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
