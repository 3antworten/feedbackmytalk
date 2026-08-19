import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import logo from "../assets/logo.png";

export default function ParticipantLayout({ joinCode, session, participant, children }) {
  const { pathname } = useLocation();
  const [hasPreparedQuestions, setHasPreparedQuestions] = useState(false);

  useEffect(() => {
    if (!session || !participant) return;
    let cancelled = false;
    api
      .listPreparedQuestions(session.id, participant.token)
      .then((d) => !cancelled && setHasPreparedQuestions(d.questions.length > 0))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, participant]);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner topbar-inner-participant">
          <img src={logo} alt="Feedback My Talk" className="brand-logo" />
          <div className="topbar-session-name">{session?.name}</div>
          <div className="row" style={{ justifySelf: "end" }}>
            {session && <span className={`badge ${session.status}`}>{session.status}</span>}
            {participant && <span className="muted small">{participant.displayName || "Anonymous"}</span>}
          </div>
        </div>
      </div>
      <div className="container">
        {joinCode && (
          <div className="tabs">
            <Link className={pathname.includes("/view") ? "active" : ""} to={`/j/${joinCode}/view`}>
              Slides
            </Link>
            <Link className={pathname.includes("/questions") ? "active" : ""} to={`/j/${joinCode}/questions`}>
              Questions
            </Link>
            <Link className={pathname.includes("/comments") ? "active" : ""} to={`/j/${joinCode}/comments`}>
              Comments
            </Link>
            {hasPreparedQuestions && (
              <Link className={pathname.includes("/practice") ? "active" : ""} to={`/j/${joinCode}/practice`}>
                Practice Q&amp;A
              </Link>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
