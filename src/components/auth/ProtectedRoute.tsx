import React, { useEffect, useState } from "react";
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
  const { user, loading, checking2FA, needs2FA, session } = useAuth();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (session?.access_token && user?.id) {
      const key = `2fa_verified:${user.id}:${session.access_token.slice(0, 16)}`;
      setIsVerified(sessionStorage.getItem(key) === "true");
    } else {
      setIsVerified(false);
    }
  }, [user, session]);

  // Show smooth minimal loader during checks
  if (loading || checking2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10">
        <p className="text-gray-500 text-sm">Checking authentication...</p>
      </div>
    );
  }

  // User not logged in
  if (requireAuth && !user) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/?auth=open&redirect=${redirectPath}&from_protected=true`}
        replace
      />
    );
  }

  // User logged in but needs to verify 2FA
  if (user && needs2FA && !isVerified) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/verify-2fa?redirect=${redirectPath}`}
        replace
      />
    );
  }

  // All checks passed
  return <>{children}</>;
};
