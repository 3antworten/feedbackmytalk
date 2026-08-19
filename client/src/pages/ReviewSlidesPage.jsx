import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Layout from "../components/Layout";
import ReviewTabs from "../components/ReviewTabs";
import CommentsBoard from "../components/CommentsBoard";
import ViewToggle from "../components/ViewToggle";

export default function ReviewSlidesPage() {
  const { deckId, sessionId } = useParams();
  const [comments, setComments] = useState(null);
  const [slides, setSlides] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("list");

  function reload() {
    Promise.all([api.sessionComments(sessionId), api.getDeck(deckId)])
      .then(([commentsData, deckData]) => {
        setComments(commentsData.comments);
        setSlides(deckData.slides);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(reload, [sessionId, deckId]);

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
      <div className="board-header">
        <h1>Comments</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>
      <p className="muted small">Every comment collected in the session, upvoted by relevance.</p>
      <ReviewTabs deckId={deckId} sessionId={sessionId} />

      {error && <p className="error-text">{error}</p>}
      {!comments && !error && <p className="spinner-note">Loading…</p>}

      {comments && (
        <CommentsBoard comments={comments} slides={slides} view={view} canModerate onDelete={removeComment} />
      )}
    </Layout>
  );
}
