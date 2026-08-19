import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useParticipantSession } from "../useParticipantSession";
import ParticipantLayout from "../components/ParticipantLayout";
import CommentItem from "../components/CommentItem";
import QuestionItem from "../components/QuestionItem";
import { slideLabel } from "../format";
import { sortByVotes } from "../feedbackSort";
import logoMark from "../assets/logo-mark.png";

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

  async function voteComment(id, value) {
    try {
      const { votes } = await api.voteComment(id, value, participant.token);
      setComments((cur) => cur.map((c) => (c.id === id ? { ...c, votes } : c)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function voteQuestion(id, value) {
    try {
      const { votes } = await api.voteQuestion(id, value, participant.token);
      setQuestions((cur) => cur.map((q) => (q.id === id ? { ...q, votes } : q)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleAskedLive(id, askedLive) {
    try {
      const { question } = await api.updateQuestion(id, { askedLive }, participant.token);
      setQuestions((cur) => cur.map((q) => (q.id === id ? { ...q, ...question } : q)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveNote(id, answerNote) {
    try {
      await api.saveQuestionResponse(id, answerNote, participant.token);
      setQuestions((cur) => cur.map((q) => (q.id === id ? { ...q, myAnswerNote: answerNote } : q)));
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
  const sortedQuestions = questions ? sortByVotes(questions, participant.id) : [];
  const sortedComments = comments ? sortByVotes(comments, participant.id) : [];

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
            Use this space for overall impressions,<br />
            wrap-up thoughts, or anything else that came up.
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
            {sortedQuestions.map((q) => (
              <QuestionItem
                key={q.id}
                question={q}
                showSlideRef={false}
                isOwn={q.authorParticipantId === participant.id}
                canModerate={false}
                canDeleteOwn={isOpen}
                onVote={voteQuestion}
                onDelete={removeQuestion}
                onToggleAskedLive={toggleAskedLive}
                onSaveNote={saveNote}
              />
            ))}
          </div>
        </div>

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
            {sortedComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                showSlideRef={false}
                isOwn={c.authorParticipantId === participant.id}
                canModerate={false}
                canDeleteOwn={isOpen}
                onVote={voteComment}
                onDelete={removeComment}
              />
            ))}
          </div>
        </div>
      </div>
    </ParticipantLayout>
  );
}
