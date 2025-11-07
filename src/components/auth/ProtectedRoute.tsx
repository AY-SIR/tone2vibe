import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true
}) => {
  const { user, loading, checking2FA } = useAuth();
  const location = useLocation();

  // Show loading while auth or 2FA status is being checked
  if (loading || checking2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
          <LoadingSpinner size="lg" text="Securing..." />
      </div>
    );
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

  // 2FA redirect is handled in App.tsx to prevent duplicate checks
  // Just render the protected content here
  return <>{children}</>;
};