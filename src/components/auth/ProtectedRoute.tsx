import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true
}) => {
  const { user, loading, checking2FA, needs2FA, session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

// Handle 2FA verification requirement
useEffect(() => {
  if (!loading && !checking2FA && user) {
    setInitialCheckDone(true);

    const isVerified = session?.access_token
      ? sessionStorage.getItem(`2fa_verified:${user.id}:${session.access_token.slice(0, 16)}`) === 'true'
      : false;

    if (needs2FA && !isVerified) {
      const currentPath = location.pathname + location.search;
      // Navigate to verify-2fa page with redirect
      navigate(`/verify-2fa?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
    }
  }
}, [loading, checking2FA, needs2FA, user, session, location, navigate]);

// Show loading during auth check
if (loading || checking2FA || (user && !initialCheckDone)) {
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10" />;
}

// Redirect to landing if auth required and user not logged in
if (requireAuth && !user) {
  const redirectPath = encodeURIComponent(location.pathname + location.search);
  return (
    <Navigate
      to={`/?auth=open&redirect=${redirectPath}&from_protected=true`}
      replace
    />
  );
}

return <>{children}</>;
};