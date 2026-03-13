import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children, adminOnly, productionOnly, userOnly }) => {
  const { data } = useSelector((state) => state.auth);

  if (!data) {
    return <Navigate to="/" replace />;
  }

  const role = data.role;

  // Admin pages
  if (adminOnly && role !== "admin") {
    if (role === "production") return <Navigate to="/head" replace />;
    if (role === "customer") return <Navigate to="/user" replace />;
  }

  // Production pages
  if (productionOnly && role !== "production") {
    if (role === "admin") return <Navigate to="/dashboard" replace />;
    if (role === "customer") return <Navigate to="/user" replace />;
  }

  // Customer pages
  if (userOnly && role !== "customer") {
    if (role === "admin") return <Navigate to="/dashboard" replace />;
    if (role === "production") return <Navigate to="/head" replace />;
  }

  return children;
};

export default ProtectedRoute;
