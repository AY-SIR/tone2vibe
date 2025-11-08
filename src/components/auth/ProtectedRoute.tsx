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

  // ✅ Keep 2FA verification status stable
  useEffect(() => {
    if (session?.access_token && user?.id) {
      const key = `2fa_verified:${user.id}:${session.access_token.slice(0, 16)}`;
      setIsVerified(sessionStorage.getItem(key) === "true");
    } else {
      setIsVerified(false);
    }
  }, [user?.id, session?.access_token]);

  // ✅ Prevent flashing loader when Supabase silently refreshes
  const shouldShowLoader =
    loading || (checking2FA && !user && requireAuth);

  if (shouldShowLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm animate-pulse">
          Checking authentication...
        </p>
      </div>
    );
  }

  // ✅ Not logged in
  if (requireAuth && !user) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/?auth=open&redirect=${redirectPath}&from_protected=true`}
        replace
      />
    );
  }

  // ✅ Logged in but needs 2FA verify
  if (user && needs2FA && !isVerified) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/verify-2fa?redirect=${redirectPath}`} replace />;
  }

  // ✅ All good — render protected content
  return <>{children}</>;
};
