import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid confirmation link. No token provided.');
        toast.error('Invalid or missing confirmation link.');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('confirm-email', {
          body: { token }
        });

        if (error) {
          console.error('Confirmation error:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to confirm email. Please try again.');
          toast.error(error.message || 'Failed to confirm email. Please try again.');
          return;
        }

        let result: any;
        try {
          result = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (parseErr) {
          console.error('Failed to parse confirm-email response:', parseErr);
          setStatus('error');
          setMessage('Invalid server response. Please try again later.');
          toast.error('Something went wrong. Please try again later.');
          return;
        }

        if (result?.error) {
          setStatus('error');
          setMessage(result.error);
          toast.error(result.error);
          return;
        }

        if (result?.success) {
          setStatus('success');
          setMessage(result.message || 'Email confirmed successfully!');
          toast.success('Email confirmed! You can now sign in.');

          // Redirect to sign-in after 2 seconds
          setTimeout(() => {
            navigate('/?auth=open&view=signin', { replace: true });
          }, 2000);
          return;
        }

        // Unexpected case: no success or error
        setStatus('error');
        setMessage('Unexpected response from server.');
        toast.error('Something went wrong. Please try again.');

      } catch (err) {
        console.error('Confirmation exception:', err);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        toast.error('An unexpected error occurred. Please try again.');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Confirming Your Email</h1>
            <p className="text-muted-foreground">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">Email Confirmed!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">Confirmation Failed</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/?auth=open&view=signin', { replace: true })}
                className="w-full"
              >
                Go to Sign In
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/', { replace: true })}
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
