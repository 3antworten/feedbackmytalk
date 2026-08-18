import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import PageLogo from "../components/PageLogo";
import { api } from "../api";

export default function RegisterPage() {
  const { register, error: authError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [confirmationSentTo, setConfirmationSentTo] = useState(null);

  useEffect(() => {
    api
      .signupStatus()
      .then((d) => setSignupsEnabled(d.enabled))
      .catch(() => setSignupsEnabled(true));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await register(email, password);
    setBusy(false);
    if (result === true) navigate("/dashboard");
    else if (result === "confirm") setConfirmationSentTo(email);
    else setError(authError || "Could not register");
  }

  if (confirmationSentTo) {
    return (
      <div className="container narrow">
        <PageLogo />
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Check your inbox</h2>
          <p className="muted small">
            We sent a confirmation link to <strong>{confirmationSentTo}</strong>. Open it to
            activate your account and log in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container narrow">
      <PageLogo />
      <div className="card">
        {signupsEnabled ? (
          <form className="stack" onSubmit={onSubmit}>
            <h2 style={{ margin: 0 }}>Create speaker account</h2>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            {error && <div className="error-text">{error}</div>}
            <button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        ) : (
          <div className="stack">
            <h2 style={{ margin: 0 }}>Sign-ups are closed</h2>
            <p className="muted small">
              The site admin has turned off new registrations right now. If you already have an
              account, you can still log in.
            </p>
          </div>
        )}
      </div>
      <p className="small muted" style={{ marginTop: "1rem" }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
