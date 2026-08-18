import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { getParticipant, setParticipant } from "../participant";
import PageLogo from "../components/PageLogo";

export default function JoinPage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api
      .lookupJoinCode(joinCode)
      .then((data) => {
        setInfo(data);
        const existing = getParticipant(data.session.id);
        if (existing) navigate(`/j/${joinCode}/view`, { replace: true });
      })
      .catch((e) => setError(e.message));
  }, [joinCode, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setJoining(true);
    setError(null);
    try {
      const data = await api.join(joinCode, name);
      setParticipant(data.session.id, data.participant);
      navigate(`/j/${joinCode}/view`);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  if (error) {
    return (
      <div className="container narrow">
        <div className="card">
          <p className="error-text">{error}</p>
        </div>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="container narrow">
        <p className="spinner-note">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container narrow">
      <PageLogo />
      <div className="card stack">
        <div>
          <strong>{info.session.name || info.deck.name}</strong>
          {info.session.name && <div className="muted small">{info.deck.name}</div>}
          <div className="muted small">
            {info.slideCount} slides · session is{" "}
            <span className={`badge ${info.session.status}`}>{info.session.status}</span>
          </div>
        </div>
        <form className="stack" onSubmit={onSubmit}>
          <label>
            Your name (optional)
            <input
              type="text"
              placeholder="Anonymous"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </label>
          <button type="submit" disabled={joining}>
            {joining ? "Joining…" : "Join session"}
          </button>
        </form>
        <p className="muted small">
          You&apos;ll be able to browse slides and leave comments/questions. If you don&apos;t set a name,
          you&apos;ll appear as &quot;Anonymous #n&quot;.
        </p>
      </div>
    </div>
  );
}
