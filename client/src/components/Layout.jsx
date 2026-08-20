import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import logo from "../assets/logo.png";

export default function Layout({ children }) {
  const { speaker, logout, stopImpersonating } = useAuth();
  const { pathname } = useLocation();
  const inAdmin = pathname.startsWith("/admin");

  return (
    <div>
      {speaker?.impersonatedBy && (
        <div className="topbar" style={{ background: "#7a4a00" }}>
          <div className="topbar-inner">
            <span className="small">Viewing as {speaker.email}</span>
            <button className="secondary small" onClick={stopImpersonating}>
              Return to admin
            </button>
          </div>
        </div>
      )}
      <div className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/dashboard">
            <img src={logo} alt="Feedback My Talk" className="brand-logo" />
          </Link>
          {speaker && (
            <div className="row">
              {speaker.isAdmin && (
                <Link className="small" to={inAdmin ? "/dashboard" : "/admin"}>
                  {inAdmin ? "Dashboard" : "Admin"}
                </Link>
              )}
              <span className="muted small">{speaker.email}</span>
              <button className="secondary small" onClick={logout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="container">{children}</div>
    </div>
  );
}
