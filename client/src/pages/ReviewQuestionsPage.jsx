import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import Layout from "../components/Layout";
import ReviewTabs from "../components/ReviewTabs";
import QuestionsBoard from "../components/QuestionsBoard";
import ViewToggle from "../components/ViewToggle";

export default function ReviewQuestionsPage() {
  const { deckId, sessionId } = useParams();
  const [questions, setQuestions] = useState(null);
  const [slides, setSlides] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("list");

  function reload() {
    Promise.all([api.sessionQuestions(sessionId), api.getDeck(deckId)])
      .then(([questionsData, deckData]) => {
        setQuestions(questionsData.questions);
        setSlides(deckData.slides);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(reload, [sessionId, deckId]);

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
      <div className="board-header">
        <h1>Questions</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>
      <p className="muted small">
        Every question collected in the session, with its slide reference, author, and how it
        was answered live.
      </p>
      <ReviewTabs deckId={deckId} sessionId={sessionId} />

      {error && <p className="error-text">{error}</p>}
      {!questions && !error && <p className="spinner-note">Loading…</p>}

      {questions && (
        <QuestionsBoard
          questions={questions}
          slides={slides}
          view={view}
          canModerate
          onDelete={removeQuestion}
        />
      )}
    </Layout>
  );
}
