import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        setMessage('Invalid confirmation link');
        return;
      }

      try {
        // Verify token
        const { data: tokenData, error: tokenError } = await supabase
          .from('email_verification_tokens')
          .select('*')
          .eq('token', token)
          .is('used_at', null)
          .single();

        if (tokenError || !tokenData) {
          setStatus('error');
          setMessage('Invalid or expired confirmation link');
          return;
        }

        // Check if token is expired
        if (new Date(tokenData.expires_at) < new Date()) {
          setStatus('error');
          setMessage('Confirmation link has expired');
          return;
        }

        // Confirm user email using admin API
        const { error: confirmError } = await supabase.auth.admin.updateUserById(
          tokenData.user_id,
          { email_confirm: true }
        );

        if (confirmError) {
          console.error('Confirmation error:', confirmError);
          setStatus('error');
          setMessage('Failed to confirm email. Please try again.');
          return;
        }

        // Mark token as used
        await supabase
          .from('email_verification_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', token);

        setStatus('success');
        setMessage('Email confirmed successfully! You can now sign in.');
        toast.success('Email confirmed! You can now sign in.');

        // Redirect to home with auth modal open
        setTimeout(() => {
          navigate('/?auth=open', { replace: true });
        }, 3000);

      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage('An error occurred. Please try again.');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-purple-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Confirming Your Email</h2>
            <p className="text-gray-600">Please wait...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-green-600">Email Confirmed!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button onClick={() => navigate('/?auth=open')} className="w-full">
              Go to Sign In
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 mx-auto text-red-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-red-600">Confirmation Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Back to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}