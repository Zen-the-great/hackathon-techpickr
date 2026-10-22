import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="container account-page"><p role="status">Checking your session…</p></main>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
  }
  return children;
}
