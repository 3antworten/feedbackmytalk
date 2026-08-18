import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Layout from "../components/Layout";
import ReviewTabs from "../components/ReviewTabs";
import { slideLabel } from "../format";

export default function ReviewSlidesPage() {
  const { deckId, sessionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  function reload() {
    api
      .reviewBySlide(sessionId)
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(reload, [sessionId]);

  async function removeComment(id) {
    if (!confirm("Delete this comment?")) return;
    try {
      await api.deleteCommentAsSpeaker(id);
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
      <h1>Feedback by Slide</h1>
      <p className="muted small">Every slide in the deck, with all comments left underneath it.</p>
      <ReviewTabs deckId={deckId} sessionId={sessionId} />

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="spinner-note">Loading…</p>}

      {data && (
        <div className="stack">
          {data.slides.map((slide) => (
            <div className="card" key={slide.id}>
              <div className="panel-columns">
                {slide.isGeneral ? (
                  <div className="slide-image general-slide-placeholder" style={{ minHeight: 160 }}>
                    <strong>General</strong>
                    <span className="muted small">Not tied to a specific slide</span>
                  </div>
                ) : (
                  <img className="slide-image" src={slide.imagePath} alt={slideLabel(slide)} />
                )}
                <div className="stack">
                  <strong>
                    {slideLabel(slide)} · {slide.comments.length} comment
                    {slide.comments.length === 1 ? "" : "s"}
                  </strong>
                  {slide.comments.length === 0 && <p className="muted small">No comments on this slide.</p>}
                  {slide.comments.map((c) => (
                    <div className="item-entry" key={c.id}>
                      <div className="meta row between">
                        <span>
                          {c.author} · {new Date(c.created_at).toLocaleString()}
                        </span>
                        <button className="ghost small" onClick={() => removeComment(c.id)} title="Delete">
                          ✕
                        </button>
                      </div>
                      <div>{c.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
