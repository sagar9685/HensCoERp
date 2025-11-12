import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { data } = useSelector((state) => state.auth);

  if (!data) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && data.role !== "admin") {
    return <Navigate to="/user" replace />;
  }

  return children;
};

export default ProtectedRoute;
