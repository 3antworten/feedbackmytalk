import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Layout from "../components/Layout";

export default function DashboardPage() {
  const [decks, setDecks] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  function reload() {
    api
      .listDecks()
      .then((d) => setDecks(d.decks))
      .catch((e) => setError(e.message));
  }

  useEffect(reload, []);

  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const name = file.name.replace(/\.pdf$/i, "");
      await api.uploadDeck(file, name);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <Layout>
      <div className="row between" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Your decks</h1>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={onFileChosen}
          />
          <button disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? "Uploading & rendering…" : "Upload new PDF"}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {decks === null && <p className="spinner-note">Loading…</p>}

      {decks && decks.length === 0 && (
        <div className="card">
          <p className="muted">No decks yet. Upload a PDF to get started — each page becomes a slide.</p>
        </div>
      )}

      {decks && decks.length > 0 && (
        <ul className="list-reset stack">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link className="deck-card" to={`/decks/${deck.id}`}>
                <div className="row between">
                  <strong>{deck.name}</strong>
                  <span className="muted small">
                    {deck.slide_count} slide{deck.slide_count === 1 ? "" : "s"} · {deck.session_count} session
                    {deck.session_count === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
