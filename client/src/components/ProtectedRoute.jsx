import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { speaker } = useAuth();
  if (speaker === undefined) return <div className="spinner-note">Loading…</div>;
  if (speaker === null) return <Navigate to="/login" replace />;
  if (adminOnly && !speaker.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
