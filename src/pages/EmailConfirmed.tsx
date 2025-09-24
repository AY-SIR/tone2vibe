import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        if (type === 'signup' && access_token && refresh_token) {
          // Attempt to set the session
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          // **THE FIX IS HERE**
          // We check if there was an error. If not, we assume success.
          if (error) {
            console.error('Error setting session:', error);
            setStatus('error');
            setMessage('Failed to set session. The link may have been used already.');
          } else {
            // Success! No error was returned.
            console.log('Email confirmed successfully, user session set.');
            setStatus('success');
            setMessage('Email confirmed successfully! Redirecting...');
            
            setTimeout(() => {
              navigate('/email-confirmed'); // Navigate to your dedicated success page
            }, 2000);
          }
        } else if (type === 'recovery') {
          // This logic seems fine for password recovery
          setStatus('success');
          setMessage('Password reset confirmed! You can now log in with your new password.');
          
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          // If the parameters are wrong
          setStatus('error');
          setMessage('Invalid or expired confirmation link. Please request a new one.');
        }
      } catch (error) {
        console.error('An unexpected error occurred during confirmation:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'error':
      case 'expired':
        return <AlertCircle className="h-12 w-12 text-destructive" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Confirming Your Email...';
      case 'success':
        return 'Email Confirmed!';
      case 'error':
        return 'Confirmation Failed';
      case 'expired':
        return 'Link Expired';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            {getIcon()}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {getTitle()}
            </h1>
            <p className="text-muted-foreground">
              {message}
            </p>
          </div>

          {status === 'error' || status === 'expired' ? (
            <div className="space-y-4">
              <Button
                onClick={() => navigate('/')}
                className="w-full"
              >
                Return to Home
              </Button>
              <p className="text-xs text-muted-foreground">
                Need help? Contact our support team for assistance.
              </p>
            </div>
          ) : null}
          
        </CardContent>
      </Card>
    </div>
  );
}
