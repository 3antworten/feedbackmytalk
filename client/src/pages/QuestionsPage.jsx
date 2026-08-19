import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useParticipantSession } from "../useParticipantSession";
import ParticipantLayout from "../components/ParticipantLayout";
import QuestionsBoard from "../components/QuestionsBoard";
import ViewToggle from "../components/ViewToggle";

export default function QuestionsPage() {
  const { joinCode } = useParams();
  const { session, participant, error: sessionError, ready } = useParticipantSession(joinCode);

  const [questions, setQuestions] = useState(null);
  const [slides, setSlides] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("list");

  function reload() {
    Promise.all([
      api.sessionQuestions(session.id, participant.token),
      api.participantSlides(session.id, participant.token),
    ])
      .then(([questionsData, slidesData]) => {
        setQuestions(questionsData.questions);
        setSlides(slidesData.slides);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (ready) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function removeQuestion(id) {
    try {
      await api.deleteQuestion(id, participant.token);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function voteQuestion(id, value) {
    try {
      const { votes } = await api.voteQuestion(id, value, participant.token);
      setQuestions((cur) => cur.map((q) => (q.id === id ? { ...q, votes } : q)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleAskedLive(id, askedLive) {
    try {
      const { question } = await api.updateQuestion(id, { askedLive }, participant.token);
      setQuestions((cur) => cur.map((q) => (q.id === id ? { ...q, ...question } : q)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveNote(id, answerNote) {
    try {
      await api.saveQuestionResponse(id, answerNote, participant.token);
      setQuestions((cur) => cur.map((q) => (q.id === id ? { ...q, myAnswerNote: answerNote } : q)));
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
  if (!ready || !questions || !slides) {
    return (
      <ParticipantLayout joinCode={joinCode}>
        <p className="spinner-note">Loading…</p>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout joinCode={joinCode} session={session} participant={participant}>
      <div className="board-header">
        <h1>Questions</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>
      <p className="muted small">
        Every question asked in this session — yours are highlighted. Anyone can mark a question
        as asked live, and once that happens everyone can leave their own note on how it landed.
      </p>
      <QuestionsBoard
        questions={questions}
        slides={slides}
        view={view}
        canModerate={false}
        canDeleteOwn={session.status === "open"}
        viewerParticipantId={participant.id}
        onVote={voteQuestion}
        onDelete={removeQuestion}
        onToggleAskedLive={toggleAskedLive}
        onSaveNote={saveNote}
      />
    </ParticipantLayout>
  );
}
