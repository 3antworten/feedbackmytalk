import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import PageLogo from "../components/PageLogo";

export default function LandingPage() {
  const { speaker } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  // Already signed in as a speaker — skip straight to the dashboard.
  if (speaker) return <Navigate to="/dashboard" replace />;
  if (speaker === undefined) return <div className="spinner-note">Loading…</div>;

  function onJoinSubmit(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate(`/j/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="container" style={{ maxWidth: 880 }}>
      <PageLogo />
      <div className="panel-columns" style={{ alignItems: "stretch" }}>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>I'm a participant</h2>
          <p className="muted small">
            Have a join code or link from a speaker? Enter it below to browse the slides and
            leave comments or questions.
          </p>
          <form className="stack" onSubmit={onJoinSubmit}>
            <label>
              Join code
              <input
                type="text"
                placeholder="e.g. TEAM-STANDUP"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={40}
              />
            </label>
            <button type="submit" disabled={!code.trim()}>
              Join session
            </button>
          </form>
        </div>

        <div className="card stack">
          <h2 style={{ margin: 0 }}>I'm a speaker</h2>
          <p className="muted small">
            Upload a deck, create a rehearsal session, and collect feedback from your
            audience.
          </p>
          <div className="stack" style={{ marginTop: "auto" }}>
            <button onClick={() => navigate("/login")}>Log in</button>
            <button className="secondary" onClick={() => navigate("/register")}>
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
