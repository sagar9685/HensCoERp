import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({
  children,
  adminOnly = false,
  production = false,
  userOnly = false, // Naya Prop
}) => {
  const { data } = useSelector((state) => state.auth);

  if (!data) {
    return <Navigate to="/" replace />;
  }

  const role = data.role;

  // 1. Production user ko Customer/User pages se block karna
  if (userOnly && role === "production") {
    return <Navigate to="/head" replace />;
  }

  // 2. Admin only routes
  if (adminOnly && role !== "admin") {
    return role === "production" ? (
      <Navigate to="/head" replace />
    ) : (
      <Navigate to="/user" replace />
    );
  }

  // 3. Production routes (Admin can also access)
  if (production && role !== "production" && role !== "admin") {
    return <Navigate to="/user" replace />;
  }

  return children;
};

export default ProtectedRoute;
