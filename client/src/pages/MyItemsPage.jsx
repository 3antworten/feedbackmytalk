import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useParticipantSession } from "../useParticipantSession";
import ParticipantLayout from "../components/ParticipantLayout";
import QuestionRecapItem from "../components/QuestionRecapItem";
import SlideThumb from "../components/SlideThumb";
import { slideLabel } from "../format";

// my-items rows carry slide info under a `slide`-prefixed shape; adapt to what
// SlideThumb/slideLabel expect.
function slideOf(row) {
  return {
    imagePath: row.slideImagePath,
    isGeneral: row.slideIsGeneral,
    title: row.slideTitle,
    orderIndex: row.slideOrderIndex,
  };
}

export default function MyItemsPage() {
  const { joinCode } = useParams();
  const { session, participant, error: sessionError, ready } = useParticipantSession(joinCode);

  const [comments, setComments] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);

  function reload() {
    api
      .myItems(session.id, participant.token)
      .then((d) => {
        setComments(d.comments);
        setQuestions(d.questions);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (ready) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function updateQuestion(id, patch) {
    try {
      await api.updateQuestion(id, patch, participant.token);
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
  if (!ready || !comments || !questions) {
    return (
      <ParticipantLayout joinCode={joinCode}>
        <p className="spinner-note">Loading…</p>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout joinCode={joinCode} session={session} participant={participant}>
      <h1>My Feedback</h1>
      <p className="muted small">
        Your own comments and questions across the session. You can always update &quot;asked
        live&quot; and your answer note on a question, even after the session closes.
      </p>

      <h2>My Questions</h2>
      {questions.length === 0 && (
        <div className="card">
          <p className="muted">You haven&apos;t asked any questions yet.</p>
        </div>
      )}
      <div className="stack">
        {questions.map((q) => (
          <div className="item-entry-with-thumb" key={q.id}>
            <SlideThumb slide={slideOf(q)} />
            <div className="item-entry-body">
              <QuestionRecapItem
                question={q}
                onUpdate={(patch) => updateQuestion(q.id, patch)}
                header={<div className="muted small">{slideLabel(slideOf(q))}</div>}
              />
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: "1.5rem" }}>My Comments</h2>
      {comments.length === 0 && (
        <div className="card">
          <p className="muted">You haven&apos;t added any comments yet.</p>
        </div>
      )}
      <div className="stack">
        {comments.map((c) => (
          <div className="item-entry-with-thumb" key={c.id}>
            <SlideThumb slide={slideOf(c)} />
            <div className="item-entry-body item-entry">
              <div className="meta">{slideLabel(slideOf(c))}</div>
              <div>{c.text}</div>
            </div>
          </div>
        ))}
      </div>
    </ParticipantLayout>
  );
}
