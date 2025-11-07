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

// Handle 2FA: open AuthModal (verify-2fa) without redirect
useEffect(() => {
  if (!loading && !checking2FA && user) {
    setInitialCheckDone(true);

    const isVerified = session?.access_token
      ? sessionStorage.getItem(`2fa_verified:${user.id}:${session.access_token.slice(0, 16)}`) === 'true'
      : false;

    if (needs2FA && !isVerified) {
      const currentPath = location.pathname + location.search;
      // Append URL params to trigger modal globally
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth') !== 'open' || params.get('view') !== 'verify-2fa') {
        params.set('auth', 'open');
        params.set('view', 'verify-2fa');
        params.set('redirect', encodeURIComponent(currentPath));
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      }
      // Also dispatch a window event so Header can open the modal immediately
      try { window.dispatchEvent(new CustomEvent('auth:open', { detail: { view: 'verify-2fa', redirect: currentPath } })); } catch {}
    }
  }
}, [loading, checking2FA, needs2FA, user, session, location, navigate]);

// Minimal branded background during auth check (no content flash)
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

// If 2FA is required and not verified, hold the page behind the modal
if (user && needs2FA && session?.access_token && sessionStorage.getItem(`2fa_verified:${user.id}:${session.access_token.slice(0,16)}`) !== 'true') {
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10" />;
}

return <>{children}</>;
};