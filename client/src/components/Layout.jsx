import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import logo from "../assets/logo.png";

export default function Layout({ children }) {
  const { speaker, logout } = useAuth();
  const { pathname } = useLocation();
  const inAdmin = pathname.startsWith("/admin");

  return (
    <div>
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
