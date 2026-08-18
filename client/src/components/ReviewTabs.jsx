import { Link, useLocation } from "react-router-dom";

export default function ReviewTabs({ deckId, sessionId }) {
  const { pathname } = useLocation();
  const base = `/decks/${deckId}/sessions/${sessionId}`;
  return (
    <div className="tabs">
      <Link className={pathname.endsWith("/manage") || pathname === base ? "active" : ""} to={base}>
        Manage
      </Link>
      <Link className={pathname.includes("/review/slides") ? "active" : ""} to={`${base}/review/slides`}>
        Feedback by Slide
      </Link>
      <Link className={pathname.includes("/review/questions") ? "active" : ""} to={`${base}/review/questions`}>
        Question Bank
      </Link>
      <Link className={pathname.includes("/review/practice") ? "active" : ""} to={`${base}/review/practice`}>
        Practice Q&amp;A
      </Link>
    </div>
  );
}
