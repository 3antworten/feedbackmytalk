import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { useParticipantSession } from "../useParticipantSession";
import ParticipantLayout from "../components/ParticipantLayout";
import CommentsBoard from "../components/CommentsBoard";
import ViewToggle from "../components/ViewToggle";

export default function CommentsPage() {
  const { joinCode } = useParams();
  const { session, participant, error: sessionError, ready } = useParticipantSession(joinCode);

  const [comments, setComments] = useState(null);
  const [slides, setSlides] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("list");

  function reload() {
    Promise.all([
      api.sessionComments(session.id, participant.token),
      api.participantSlides(session.id, participant.token),
    ])
      .then(([commentsData, slidesData]) => {
        setComments(commentsData.comments);
        setSlides(slidesData.slides);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (ready) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function removeComment(id) {
    try {
      await api.deleteComment(id, participant.token);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function voteComment(id, value) {
    try {
      const { votes } = await api.voteComment(id, value, participant.token);
      setComments((cur) => cur.map((c) => (c.id === id ? { ...c, votes } : c)));
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
  if (!ready || !comments || !slides) {
    return (
      <ParticipantLayout joinCode={joinCode}>
        <p className="spinner-note">Loading…</p>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout joinCode={joinCode} session={session} participant={participant}>
      <div className="board-header">
        <h1>Comments</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>
      <p className="muted small">Every comment left in this session — yours are highlighted.</p>
      {session.status !== "open" && (
        <p className="muted small">
          This session is closed — you can browse existing comments, but voting and new comments
          are no longer possible.
        </p>
      )}
      <CommentsBoard
        comments={comments}
        slides={slides}
        view={view}
        canModerate={false}
        canDeleteOwn={session.status === "open"}
        sessionOpen={session.status === "open"}
        viewerParticipantId={participant.id}
        onVote={voteComment}
        onDelete={removeComment}
      />
    </ParticipantLayout>
  );
}
