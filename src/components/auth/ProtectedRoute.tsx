import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAuth = true }) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  const [checking2FA, setChecking2FA] = useState(true);
  const [needs2FA, setNeeds2FA] = useState(false);

  // Wait for auth state to initialize before redirecting
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // If auth not required or user missing, no 2FA check
      if (!requireAuth || !user) {
        setNeeds2FA(false);
        setChecking2FA(false);
        return;
      }

      try {
        const { data: settings } = await supabase
          .from('user_2fa_settings')
          .select('enabled')
          .eq('user_id', user.id)
          .single();

        const tokenPart = session?.access_token ? session.access_token.slice(0, 16) : 'no-token';
        const verifiedKey = `2fa_verified:${user.id}:${tokenPart}`;
        const isVerified = sessionStorage.getItem(verifiedKey) === 'true';

        setNeeds2FA(!!settings?.enabled && !isVerified);
      } finally {
        if (!cancelled) setChecking2FA(false);
      }
    };

    // Only run when auth state ready
    if (!loading) run();

    return () => {
      cancelled = true;
    };
  }, [requireAuth, user?.id, loading, session?.access_token]);

  if (loading || checking2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to landing if auth required and user not logged in
  if (requireAuth && !user) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?auth=open&redirect=${redirectPath}&from_protected=true`} replace />;
  }

  // 2FA gating BEFORE rendering any protected content (prevents page flash)
  if (needs2FA && location.pathname !== '/verify-2fa') {
    return <Navigate to="/verify-2fa" replace />;
  }

  return <>{children}</>;
};
