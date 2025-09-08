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
        const token = searchParams.get('token');

        console.log('Email confirmation params:', { type, hasToken: !!token, hasAccessToken: !!access_token });

        if (type === 'signup' && access_token && refresh_token) {
          // Set the session using the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('error');
            setMessage('Failed to confirm email. Please try again or contact support.');
            return;
          }

          if (data.session) {
            console.log('Email confirmed successfully, user logged in');
            setStatus('success');
            setMessage('Email confirmed successfully! Redirecting to your dashboard...');
            
            // Redirect after a short delay
            setTimeout(() => {
              navigate('/tool');
            }, 2000);
          }
        } else if (type === 'recovery') {
          setStatus('success');
          setMessage('Password reset confirmed! You can now set a new password.');
          
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email and try again.');
        }
      } catch (error) {
        console.error('Confirmation error:', error);
        setStatus('error');
        setMessage('An error occurred during confirmation. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'error':
      case 'expired':
        return <AlertCircle className="h-12 w-12 text-destructive" />;
      default:
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Confirming Email...';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            {getIcon()}
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">
              {getTitle()}
            </h1>
            
            <p className="text-muted-foreground">
              {message}
            </p>
          </div>

          {status === 'error' && (
            <div className="space-y-3">
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
          )}

          {status === 'loading' && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse w-2/3"></div>
              </div>
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your email address...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}