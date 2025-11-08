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
  const [shouldRedirect, setShouldRedirect] = useState(false);

// Handle 2FA verification requirement
useEffect(() => {
  // Don't check 2FA if we're already on the verify-2fa page
  if (location.pathname === '/verify-2fa') {
    setInitialCheckDone(true);
    return;
  }

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

// Handle redirect for non-authenticated users
useEffect(() => {
  if (!loading && !checking2FA && requireAuth && !user) {
    setShouldRedirect(true);
  }
}, [loading, checking2FA, requireAuth, user]);

// Show loading during auth check - keep it minimal to avoid flash
if (loading || checking2FA || (user && !initialCheckDone && location.pathname !== '/verify-2fa')) {
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10" />;
}

// Redirect to landing if auth required and user not logged in
if (shouldRedirect) {
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
