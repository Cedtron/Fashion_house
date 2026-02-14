
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const tokenFromCookies = Cookies.get("token");
  const tokenFromStorage = localStorage.getItem("token");
  
  const isLoggedIn = tokenFromCookies || tokenFromStorage;

  return isLoggedIn ? children : <Navigate to="/signin" replace />;
}
