
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const isLoggedIn = localStorage.getItem("token"); // or whatever you use for auth

  return isLoggedIn ? children : <Navigate to="/signin" replace />;
}
