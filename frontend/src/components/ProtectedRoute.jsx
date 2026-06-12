// Component: ProtectedRoute.jsx
// Guards routes that require authentication or a specific role.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

/**
 * ProtectedRoute
 * Redirects to /login if user is not authenticated.
 * If allowedRoles is provided, also enforces role access.
 *
 * @param {{ allowedRoles?: string[] }} props
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
