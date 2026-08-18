import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import PageLogo from "../components/PageLogo";

export default function ConfirmEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState(null);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return; // StrictMode double-invokes effects in dev; only call once
    requested.current = true;
    api
      .confirmEmail(token)
      .then(async () => {
        await refresh();
        navigate("/dashboard", { replace: true });
      })
      .catch(async (e) => {
        // The token may have already been consumed by an earlier request for this same
        // link (e.g. an email client prefetching it, or a duplicate click) — if we're
        // actually logged in already, treat that as success instead of showing an error.
        const speaker = await refresh();
        if (speaker) {
          navigate("/dashboard", { replace: true });
        } else {
          setError(e.message);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="container narrow">
      <PageLogo />
      <div className="card stack">
        {error ? (
          <>
            <h2 style={{ margin: 0 }}>Could not confirm your account</h2>
            <p className="error-text">{error}</p>
            <p className="muted small">
              You can request a new link from the <Link to="/login">login screen</Link>.
            </p>
          </>
        ) : (
          <p className="muted small">Confirming your account…</p>
        )}
      </div>
    </div>
  );
}
