import Cookies from "js-cookie";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export function RoleGuard() {
  const location = useLocation();
  const userData = Cookies.get("user");
  const user = userData ? JSON.parse(userData) : null;

  // Non-admins only allowed to see /app/stock
  if (user?.role !== "Admin") {
    if (!location.pathname.startsWith("/app/stock")) {
      return <Navigate to="/app/stock" replace />;
    }
  }

  return <Outlet />;
}
