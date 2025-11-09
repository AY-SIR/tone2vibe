import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm animate-pulse">
          Checking authentication...
        </p>
      </div>
    );
  }

  // Not logged in
  if (requireAuth && !user) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/?auth=open&redirect=${redirectPath}&from_protected=true`}
        replace
      />
    );
  }

  // All good — render protected content
  return <>{children}</>;
};
