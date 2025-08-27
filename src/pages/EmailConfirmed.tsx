import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function EmailConfirmed() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Parse hash and search parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    const confirmationType = searchParams.get('type');
    const token = searchParams.get('token');
    const redirectTo = searchParams.get('redirect_to') || '/'; // fallback to home

    // Determine if email is confirmed
    const emailConfirmed =
      (accessToken && refreshToken) ||
      type === 'signup' ||
      type === 'email_confirmation' ||
      confirmationType === 'email_confirmation' ||
      token ||
      user?.email_confirmed_at;

    if (emailConfirmed) {
      // Show success message for exactly 5 seconds, then redirect
      setTimeout(() => {
        setIsRedirecting(true);
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 2000); // 2 seconds for redirect animation
      }, 5000); // Show confirmation for 5 seconds
    } else if (user && !user.email_confirmed_at) {
      // Logged in but email not confirmed - redirect after 3 seconds
      setTimeout(() => {
        setIsRedirecting(true);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      }, 3000);
    } else {
      // No user, no token — redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    }
  }, [navigate, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {!isRedirecting ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Email Confirmed!
              </h1>
              <p className="text-gray-600 mb-6">
                Your email has been successfully verified. You can now access all features.
              </p>
              <div className="text-sm text-gray-500">
                Redirecting you in a moment...
              </div>
            </>
          ) : (
            <>
              <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-6 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Redirecting...
              </h1>
              <p className="text-gray-600">
                Taking you to the home page now
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
