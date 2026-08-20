import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import Layout from "../components/Layout";

export default function AdminPage() {
  const { speaker, refresh } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [speakers, setSpeakers] = useState(null);
  const [decks, setDecks] = useState(null);
  const [error, setError] = useState(null);
  const [togglingSignups, setTogglingSignups] = useState(false);

  function reload() {
    api.adminGetSettings().then(setSettings).catch((e) => setError(e.message));
    api
      .adminListSpeakers()
      .then((d) => setSpeakers(d.speakers))
      .catch((e) => setError(e.message));
    api
      .adminListDecks()
      .then((d) => setDecks(d.decks))
      .catch((e) => setError(e.message));
  }

  useEffect(reload, []);

  async function toggleSignups() {
    setTogglingSignups(true);
    setError(null);
    try {
      const updated = await api.adminUpdateSettings({ signupsEnabled: !settings.signupsEnabled });
      setSettings(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingSignups(false);
    }
  }

  async function deleteSpeaker(s) {
    if (!confirm(`Delete ${s.email}? This deletes all of their decks, sessions, and collected feedback.`)) return;
    setError(null);
    try {
      await api.adminDeleteSpeaker(s.id);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteDeck(d) {
    if (!confirm(`Delete "${d.name}" (owned by ${d.speakerEmail})? This deletes its sessions and feedback.`))
      return;
    setError(null);
    try {
      await api.adminDeleteDeck(d.id);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function viewAs(s) {
    setError(null);
    try {
      await api.adminImpersonate(s.id);
      await refresh();
      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Layout>
      <h1>Admin</h1>
      {error && <p className="error-text">{error}</p>}

      <div className="card stack" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Site settings</h2>
        {settings === null ? (
          <p className="muted small">Loading…</p>
        ) : (
          <div className="row between">
            <div>
              <strong>Allow new sign-ups</strong>
              <p className="muted small" style={{ margin: 0 }}>
                When off, only existing speaker accounts can log in — the register screen tells
                visitors sign-ups are closed.
              </p>
            </div>
            <button
              className={settings.signupsEnabled ? "secondary" : ""}
              disabled={togglingSignups}
              onClick={toggleSignups}
            >
              {settings.signupsEnabled ? "Disable sign-ups" : "Enable sign-ups"}
            </button>
          </div>
        )}
        {settings !== null && (
          <p className="muted small" style={{ margin: 0 }}>
            Email confirmation on sign-up:{" "}
            {settings.mailEnabled ? (
              <span className="badge open">Mail configured</span>
            ) : (
              <span className="badge closed">No mail server configured</span>
            )}{" "}
            {!settings.mailEnabled &&
              "— new accounts are activated immediately. Set SMTP_HOST (and APP_DOMAIN) on the server to require confirmation."}
          </p>
        )}
      </div>

      <div className="card stack" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Speakers</h2>
        {speakers === null && <p className="muted small">Loading…</p>}
        {speakers && (
          <div className="stack">
            {speakers.map((s) => (
              <div className="item-entry row between" key={s.id}>
                <div>
                  <div>
                    {s.email} {s.isAdmin && <span className="badge open">Admin</span>}
                    {!s.emailConfirmed && <span className="badge closed">Unconfirmed</span>}
                    {s.id === speaker.id && <span className="muted small"> (you)</span>}
                  </div>
                  <div className="muted small">
                    {s.deckCount} deck{s.deckCount === 1 ? "" : "s"} · {s.sessionCount} session
                    {s.sessionCount === 1 ? "" : "s"} · joined {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {s.id !== speaker.id && (
                  <div className="row">
                    <button className="secondary small" onClick={() => viewAs(s)}>
                      View as
                    </button>
                    <button className="danger small" onClick={() => deleteSpeaker(s)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>All decks</h2>
        {decks === null && <p className="muted small">Loading…</p>}
        {decks?.length === 0 && <p className="muted small">No decks uploaded yet.</p>}
        {decks && decks.length > 0 && (
          <div className="stack">
            {decks.map((d) => (
              <div className="item-entry row between" key={d.id}>
                <div>
                  <div>{d.name}</div>
                  <div className="muted small">
                    {d.speakerEmail} · {d.slideCount} slide{d.slideCount === 1 ? "" : "s"} · {d.sessionCount}{" "}
                    session{d.sessionCount === 1 ? "" : "s"} · {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button className="danger small" onClick={() => deleteDeck(d)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
