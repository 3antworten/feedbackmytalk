import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import PageLogo from "../components/PageLogo";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUnconfirmed(false);
    setResent(false);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      if (err.data?.requiresConfirmation) {
        setUnconfirmed(true);
      } else {
        setError(err.message || "Invalid email or password");
      }
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    setBusy(true);
    try {
      await api.resendConfirmation(email);
      setResent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container narrow">
      <PageLogo />
      <div className="card">
        <form className="stack" onSubmit={onSubmit}>
          <h2 style={{ margin: 0 }}>Speaker log in</h2>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="error-text">{error}</div>}
          {unconfirmed && (
            <div className="stack">
              <div className="error-text">
                Please confirm your email address before logging in — check your inbox for the link.
              </div>
              <button type="button" className="secondary" disabled={busy || resent} onClick={resendConfirmation}>
                {resent ? "Confirmation email sent" : "Resend confirmation email"}
              </button>
            </div>
          )}
          <button type="submit" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
      <p className="small muted" style={{ marginTop: "1rem" }}>
        No account yet? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
