import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api";
import Layout from "../components/Layout";
import ReviewTabs from "../components/ReviewTabs";
import PreparedQuestionsAdmin from "../components/PreparedQuestionsAdmin";

export default function SessionManagePage() {
  const { deckId, sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  const [nameDraft, setNameDraft] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [joinCodeDraft, setJoinCodeDraft] = useState("");
  const [joinCodeDirty, setJoinCodeDirty] = useState(false);
  const [savingJoinCode, setSavingJoinCode] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState(null);

  function reload() {
    api
      .getSession(sessionId)
      .then((d) => {
        setData(d);
        setNameDraft(d.session.name || "");
        setNameDirty(false);
        setJoinCodeDraft(d.session.joinCode);
        setJoinCodeDirty(false);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(reload, [sessionId]);

  async function toggleStatus() {
    setToggling(true);
    setError(null);
    try {
      const nextStatus = data.session.status === "open" ? "closed" : "open";
      const updated = await api.updateSession(sessionId, { status: nextStatus });
      setData((d) => ({ ...d, session: updated.session }));
    } catch (e) {
      setError(e.message);
    } finally {
      setToggling(false);
    }
  }

  async function saveJoinCode() {
    setSavingJoinCode(true);
    setJoinCodeError(null);
    try {
      const updated = await api.updateSession(sessionId, { joinCode: joinCodeDraft });
      setData((d) => ({ ...d, session: updated.session }));
      setJoinCodeDraft(updated.session.joinCode);
      setJoinCodeDirty(false);
    } catch (e) {
      setJoinCodeError(e.message);
    } finally {
      setSavingJoinCode(false);
    }
  }

  async function deleteSession() {
    if (
      !confirm(
        `Delete this session${data.session.name ? ` ("${data.session.name}")` : ""}? All of its comments, questions, and practice-question responses will be gone for good. The deck itself is not affected.`
      )
    )
      return;
    setDeletingSession(true);
    setError(null);
    try {
      await api.deleteSession(sessionId);
      navigate(`/decks/${deckId}`);
    } catch (e) {
      setError(e.message);
      setDeletingSession(false);
    }
  }

  async function saveName() {
    setSavingName(true);
    setError(null);
    try {
      const updated = await api.updateSession(sessionId, { name: nameDraft });
      setData((d) => ({ ...d, session: updated.session }));
      setNameDirty(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingName(false);
    }
  }

  if (error) {
    return (
      <Layout>
        <p className="error-text">{error}</p>
      </Layout>
    );
  }
  if (!data) {
    return (
      <Layout>
        <p className="spinner-note">Loading…</p>
      </Layout>
    );
  }

  const joinUrl = `${window.location.origin}/j/${data.session.joinCode}`;

  return (
    <Layout>
      <p>
        <Link to={`/decks/${deckId}`}>← Back to {data.deck.name}</Link>
      </p>

      <div className="row between" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>{data.session.name || `Session · ${data.session.joinCode}`}</h1>
        <span className={`badge ${data.session.status}`}>{data.session.status}</span>
      </div>

      <p className="muted small">
        Share the join link, control who can still contribute, and manage practice questions.
      </p>
      <ReviewTabs deckId={deckId} sessionId={sessionId} />

      <div className="panel-columns">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Share with participants</h2>
          <div className="qr-box qr-box-fill">
            <QRCodeSVG value={joinUrl} size={512} style={{ width: "100%", height: "auto" }} />
          </div>
          <div className="row">
            <input type="text" readOnly value={joinUrl} onFocus={(e) => e.target.select()} />
            <button
              className="secondary"
              onClick={() => {
                navigator.clipboard.writeText(joinUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="muted small">
            Participants scan the QR code or open the link — no account needed. They can browse slides freely
            and leave comments/questions.
          </p>
        </div>

        <div className="card stack">
          <h2 style={{ margin: 0 }}>Session control</h2>

          <label className="small">
            Session name
            <div className="row">
              <input
                type="text"
                placeholder={`Session · ${data.session.joinCode}`}
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value);
                  setNameDirty(true);
                }}
                maxLength={120}
              />
              <button
                className="secondary"
                disabled={!nameDirty || savingName}
                onClick={saveName}
                type="button"
              >
                {savingName ? "Saving…" : "Save"}
              </button>
            </div>
          </label>
          <p className="muted small" style={{ margin: 0 }}>
            Shown to participants alongside the app name, e.g. on their join screen and slide view.
          </p>

          <label className="small">
            Join code
            <div className="row">
              <input
                type="text"
                value={joinCodeDraft}
                onChange={(e) => {
                  setJoinCodeDraft(e.target.value);
                  setJoinCodeDirty(true);
                  setJoinCodeError(null);
                }}
                maxLength={40}
              />
              <button
                className="secondary"
                disabled={!joinCodeDirty || savingJoinCode || !joinCodeDraft.trim()}
                onClick={saveJoinCode}
                type="button"
              >
                {savingJoinCode ? "Saving…" : "Save"}
              </button>
            </div>
          </label>
          {joinCodeError && <p className="error-text" style={{ margin: 0 }}>{joinCodeError}</p>}
          <p className="muted small" style={{ margin: 0 }}>
            Letters, digits, and hyphens only — change it to something easy to say out loud, e.g.{" "}
            <code>TEAM-STANDUP</code>.
          </p>

          <p className="muted small">
            Only <strong>open</strong> sessions accept new, edited, or deleted participant input. Closing a
            session makes it read-only for participants (their askedLive/answer notes on questions stay
            editable regardless).
          </p>
          <button className={data.session.status === "open" ? "danger" : ""} disabled={toggling} onClick={toggleStatus}>
            {toggling
              ? "Updating…"
              : data.session.status === "open"
                ? "Close session"
                : "Reopen session"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <PreparedQuestionsAdmin sessionId={sessionId} />
      </div>

      <div className="card stack" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Danger zone</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Permanently deletes this session and everything collected in it (comments, questions,
          practice-question responses). The deck stays intact and can still be used for other
          sessions.
        </p>
        <button className="danger" disabled={deletingSession} onClick={deleteSession} style={{ alignSelf: "flex-start" }}>
          {deletingSession ? "Deleting…" : "Delete this session"}
        </button>
      </div>
    </Layout>
  );
}
