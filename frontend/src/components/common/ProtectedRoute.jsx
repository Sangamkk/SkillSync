import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "./Loader";

/**
 * Wraps a route so that:
 *  - Unauthenticated users are redirected to /login (with return path preserved)
 *  - Authenticated users with the wrong role are redirected to their own dashboard
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    const dashboards = {
      STUDENT: "/student/dashboard",
      ORGANISATION: "/organisation",
      ADMIN: "/admin",
    };
    return <Navigate to={dashboards[role] || "/"} replace />;
  }

  return children;
};

export default ProtectedRoute;
