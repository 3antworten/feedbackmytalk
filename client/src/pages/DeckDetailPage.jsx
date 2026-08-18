import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import Layout from "../components/Layout";

export default function DeckDetailPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [deletingDeck, setDeletingDeck] = useState(false);

  function reload() {
    api
      .getDeck(deckId)
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(reload, [deckId]);

  async function createSession(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const { session } = await api.createSession(deckId, newSessionName.trim());
      navigate(`/decks/${deckId}/sessions/${session.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  const realSlideCount = data ? data.slides.filter((s) => !s.isGeneral).length : 0;

  async function deleteDeck() {
    const sessionCount = data.sessions.length;
    const warning =
      sessionCount > 0
        ? `Delete "${data.deck.name}"? This also deletes its ${sessionCount} session${
            sessionCount === 1 ? "" : "s"
          } and all collected feedback. This can't be undone.`
        : `Delete "${data.deck.name}"? This can't be undone.`;
    if (!confirm(warning)) return;
    setDeletingDeck(true);
    setError(null);
    try {
      await api.deleteDeck(deckId);
      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
      setDeletingDeck(false);
    }
  }

  return (
    <Layout>
      <p>
        <Link to="/dashboard">← Back to decks</Link>
      </p>
      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="spinner-note">Loading…</p>}
      {data && (
        <>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div>
              <h1 style={{ marginBottom: "0.25rem" }}>{data.deck.name}</h1>
              <p className="muted small">
                {realSlideCount} slide{realSlideCount === 1 ? "" : "s"} rendered from the uploaded PDF.
              </p>
            </div>
            <button className="danger small" disabled={deletingDeck} onClick={deleteDeck}>
              {deletingDeck ? "Deleting…" : "Delete deck"}
            </button>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <form className="row" onSubmit={createSession}>
              <input
                type="text"
                placeholder="New session name (optional)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                maxLength={120}
              />
              <button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create new session"}
              </button>
            </form>
          </div>

          <h2>Sessions</h2>
          {data.sessions.length === 0 && (
            <div className="card">
              <p className="muted">
                No sessions yet. Create one to get a shareable join link and QR code for this deck.
              </p>
            </div>
          )}
          {data.sessions.length > 0 && (
            <ul className="list-reset stack">
              {data.sessions.map((session) => (
                <li key={session.id}>
                  <Link className="session-card" to={`/decks/${deckId}/sessions/${session.id}`}>
                    <div className="row between">
                      <span>
                        {session.name || "Session"} · <code>{session.joinCode}</code>
                      </span>
                      <span className={`badge ${session.status}`}>{session.status}</span>
                    </div>
                    <div className="muted small">Created {new Date(session.createdAt).toLocaleString()}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Layout>
  );
}
