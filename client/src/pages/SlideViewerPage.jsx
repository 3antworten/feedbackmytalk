import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useParticipantSession } from "../useParticipantSession";
import ParticipantLayout from "../components/ParticipantLayout";
import { slideLabel } from "../format";
import logoMark from "../assets/logo-mark.png";

// Own items first (visually separated), then everyone else's, oldest first within each group.
function splitMineFirst(list, participantId) {
  const mine = list.filter((i) => i.authorParticipantId === participantId);
  const others = list.filter((i) => i.authorParticipantId !== participantId);
  return { mine, others };
}

export default function SlideViewerPage() {
  const { joinCode, slideIdx } = useParams();
  const navigate = useNavigate();
  const { session, participant, error: sessionError, ready } = useParticipantSession(joinCode);

  const [slides, setSlides] = useState(null);
  const [error, setError] = useState(null);

  const [comments, setComments] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [busy, setBusy] = useState(false);

  const index = Math.max(0, parseInt(slideIdx ?? "0", 10) || 0);

  useEffect(() => {
    if (!ready) return;
    api
      .participantSlides(session.id, participant.token)
      .then((data) => setSlides(data.slides))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const currentSlide = slides ? slides[Math.min(index, slides.length - 1)] : null;

  const loadItems = useCallback(() => {
    if (!session || !currentSlide || !participant) return;
    api.listComments(session.id, currentSlide.id, participant.token).then((d) => setComments(d.comments));
    api.listQuestions(session.id, currentSlide.id, participant.token).then((d) => setQuestions(d.questions));
  }, [session, currentSlide, participant]);

  useEffect(() => {
    setComments(null);
    setQuestions(null);
    loadItems();
  }, [loadItems]);

  function goTo(newIndex) {
    if (!slides) return;
    const clamped = Math.min(Math.max(newIndex, 0), slides.length - 1);
    navigate(`/j/${joinCode}/view/${clamped}`);
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      await api.addComment(session.id, currentSlide.id, commentText.trim(), participant.token);
      setCommentText("");
      loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestion(e) {
    e.preventDefault();
    if (!questionText.trim()) return;
    setBusy(true);
    try {
      await api.addQuestion(session.id, currentSlide.id, questionText.trim(), participant.token);
      setQuestionText("");
      loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(id) {
    try {
      await api.deleteComment(id, participant.token);
      loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeQuestion(id) {
    try {
      await api.deleteQuestion(id, participant.token);
      loadItems();
    } catch (err) {
      setError(err.message);
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
  if (!ready || !slides || !session) {
    return (
      <ParticipantLayout joinCode={joinCode}>
        <p className="spinner-note">Loading…</p>
      </ParticipantLayout>
    );
  }

  const isOpen = session.status === "open";
  const { mine: myComments, others: otherComments } = comments
    ? splitMineFirst(comments, participant.id)
    : { mine: [], others: [] };
  const { mine: myQuestions, others: otherQuestions } = questions
    ? splitMineFirst(questions, participant.id)
    : { mine: [], others: [] };

  return (
    <ParticipantLayout joinCode={joinCode} session={session} participant={participant}>
      <div className="row between" style={{ marginBottom: "0.75rem" }}>
        <button className="secondary small" disabled={index === 0} onClick={() => goTo(index - 1)}>
          ← Prev
        </button>
        <select
          className="small"
          value={index}
          onChange={(e) => goTo(parseInt(e.target.value, 10))}
          style={{ width: "auto", maxWidth: "60%" }}
        >
          {slides.map((s, i) => (
            <option key={s.id} value={i}>
              {slideLabel(s)}
            </option>
          ))}
        </select>
        <button className="secondary small" disabled={index === slides.length - 1} onClick={() => goTo(index + 1)}>
          Next →
        </button>
      </div>

      {currentSlide.isGeneral ? (
        <div className="card general-slide-placeholder">
          <img src={logoMark} alt="" className="wrap-up-mark" />
          <h2 style={{ margin: 0 }}>That&apos;s a wrap</h2>
          <p className="muted small" style={{ maxWidth: 420 }}>
            Not tied to a specific slide — use this space for overall impressions, wrap-up
            thoughts, or anything else that came up.
          </p>
        </div>
      ) : (
        <img className="slide-image" src={currentSlide.imagePath} alt={slideLabel(currentSlide)} />
      )}

      {!isOpen && (
        <p className="muted small" style={{ marginTop: "0.6rem" }}>
          This session is closed — you can view existing comments and questions, but can no longer add,
          edit, or delete them here.
        </p>
      )}

      <div className="panel-columns" style={{ marginTop: "1.25rem" }}>
        <div className="stack">
          <h3 style={{ margin: 0 }}>Comments</h3>
          {isOpen && (
            <form className="row" onSubmit={submitComment}>
              <input
                type="text"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={2000}
              />
              <button type="submit" disabled={busy || !commentText.trim()}>
                Add
              </button>
            </form>
          )}
          <div className="stack">
            {comments === null && <p className="muted small">Loading…</p>}
            {comments?.length === 0 && <p className="muted small">No comments yet on this slide.</p>}
            {myComments.map((c) => (
              <div className="item-entry own" key={c.id}>
                <div className="meta row between">
                  <span>You · {new Date(c.created_at).toLocaleTimeString()}</span>
                  {isOpen && (
                    <button className="ghost small" onClick={() => removeComment(c.id)} title="Delete">
                      ✕
                    </button>
                  )}
                </div>
                <div>{c.text}</div>
              </div>
            ))}
            {myComments.length > 0 && otherComments.length > 0 && (
              <div className="divider-label">From others</div>
            )}
            {otherComments.map((c) => (
              <div className="item-entry" key={c.id}>
                <div className="meta">
                  {c.author} · {new Date(c.created_at).toLocaleTimeString()}
                </div>
                <div>{c.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <h3 style={{ margin: 0 }}>Questions</h3>
          {isOpen && (
            <form className="row" onSubmit={submitQuestion}>
              <input
                type="text"
                placeholder="Ask a question…"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                maxLength={2000}
              />
              <button type="submit" disabled={busy || !questionText.trim()}>
                Add
              </button>
            </form>
          )}
          <div className="stack">
            {questions === null && <p className="muted small">Loading…</p>}
            {questions?.length === 0 && <p className="muted small">No questions yet on this slide.</p>}
            {myQuestions.map((q) => (
              <div className="item-entry own" key={q.id}>
                <div className="meta row between">
                  <span>You · {new Date(q.created_at).toLocaleTimeString()}</span>
                  {isOpen && (
                    <button className="ghost small" onClick={() => removeQuestion(q.id)} title="Delete">
                      ✕
                    </button>
                  )}
                </div>
                <div>{q.text}</div>
              </div>
            ))}
            {myQuestions.length > 0 && otherQuestions.length > 0 && (
              <div className="divider-label">From others</div>
            )}
            {otherQuestions.map((q) => (
              <div className="item-entry" key={q.id}>
                <div className="meta">
                  {q.author} · {new Date(q.created_at).toLocaleTimeString()}
                </div>
                <div>{q.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ParticipantLayout>
  );
}
