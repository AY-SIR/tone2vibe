import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';

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

  // Handle 2FA redirect
  useEffect(() => {
    if (!loading && !checking2FA && user) {
      setInitialCheckDone(true);
      
      // Check session verification
      const isVerified = session?.access_token 
        ? sessionStorage.getItem(`2fa_verified:${user.id}:${session.access_token.slice(0, 16)}`) === 'true'
        : false;

      if (needs2FA && !isVerified) {
        const currentPath = location.pathname + location.search;
        const redirectUrl = `/verify-2fa?redirect=${encodeURIComponent(currentPath)}`;
        navigate(redirectUrl, { replace: true });
      }
    }
  }, [loading, checking2FA, needs2FA, user, session, location, navigate]);

  // Show elegant loading skeleton during auth check
  if (loading || checking2FA || (user && !initialCheckDone)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10">
        <Card className="w-full max-w-md mx-4 border-primary/20 shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 animate-ping">
                  <Shield className="w-12 h-12 text-primary/30" />
                </div>
                <Shield className="w-12 h-12 text-primary relative z-10" />
              </div>
              <div className="space-y-3 w-full">
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
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

  return <>{children}</>;
};