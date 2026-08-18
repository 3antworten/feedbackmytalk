import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useParticipantSession } from "../useParticipantSession";
import ParticipantLayout from "../components/ParticipantLayout";
import QuestionRecapItem from "../components/QuestionRecapItem";

export default function PracticeQAPage() {
  const { joinCode } = useParams();
  const { session, participant, error: sessionError, ready } = useParticipantSession(joinCode);

  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ready) return;
    api
      .listPreparedQuestions(session.id, participant.token)
      .then((d) => setQuestions(d.questions))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function respond(id, patch) {
    try {
      await api.respondToPreparedQuestion(session.id, id, patch, participant.token);
    } catch (e) {
      setError(e.message);
    }
  }

  const combinedError = sessionError || error;
  if (combinedError) {
    return (
      <ParticipantLayout joinCode={joinCode}>
        <p className="error-text">{combinedError}</p>
      </ParticipantLayout>
    );
  }
  if (!ready || !questions) {
    return (
      <ParticipantLayout joinCode={joinCode}>
        <p className="spinner-note">Loading…</p>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout joinCode={joinCode} session={session} participant={participant}>
      <h1>Practice Q&amp;A</h1>
      <p className="muted small">
        Questions the speaker anticipates and wants to rehearse answering. Use this to plan
        which ones you might ask, and note privately how well they land — only you see your
        notes here.
      </p>

      {questions.length === 0 && (
        <div className="card">
          <p className="muted">No practice questions have been added for this session.</p>
        </div>
      )}

      <div className="stack">
        {questions.map((q) => (
          <QuestionRecapItem key={q.id} question={q} onUpdate={(patch) => respond(q.id, patch)} />
        ))}
      </div>
    </ParticipantLayout>
  );
}
