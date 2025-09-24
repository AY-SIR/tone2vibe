import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    handleEmailConfirmation();
  }, [searchParams]);

  const handleEmailConfirmation = async () => {
    try {
      setStatus('loading');
      setMessage('Confirming your email...');

      // Get URL parameters from both hash and search params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get('access_token') || searchParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const type = hashParams.get('type') || searchParams.get('type');
      const token_hash = hashParams.get('token_hash') || searchParams.get('token_hash');
      const error_code = hashParams.get('error_code') || searchParams.get('error_code');
      const error_description = hashParams.get('error_description') || searchParams.get('error_description');

      console.log('Email confirmation params:', { 
        type, 
        hasAccessToken: !!access_token, 
        hasRefreshToken: !!refresh_token,
        hasTokenHash: !!token_hash,
        errorCode: error_code,
        errorDescription: error_description
      });

      // Check for errors first
      if (error_code) {
        console.error('Email confirmation error:', error_code, error_description);
        setStatus('error');
        
        if (error_code === 'signup_disabled') {
          setMessage('Account registration is currently disabled. Please try again later.');
        } else if (error_code === 'email_not_confirmed') {
          setMessage('Email confirmation failed. Please check your email and try clicking the confirmation link again.');
        } else {
          setMessage(error_description || 'Email confirmation failed. Please try again.');
        }
        return;
      }

      // Handle different confirmation types
      if (type === 'signup' || type === 'email_confirmation') {
        if (access_token && refresh_token) {
          // Set the session using the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (error) {
            console.error('Error setting session:', error);
            
            if (error.message.includes('expired')) {
              setStatus('expired');
              setMessage('This confirmation link has expired. Please request a new confirmation email.');
            } else if (error.message.includes('invalid')) {
              setStatus('error');
              setMessage('Invalid confirmation link. Please check your email and try again.');
            } else {
              setStatus('error');
              setMessage('Failed to confirm email. Please try again or contact support.');
            }
            return;
          }

          if (data.session && data.user) {
            console.log('Email confirmed successfully, user logged in');
            setStatus('success');
            setMessage('Email confirmed successfully! Welcome to Tone2Vibe.');
            
            // Show success toast
            toast({
              title: "Email Confirmed!",
              description: "Your account has been verified successfully.",
            });
            
            // Redirect to email-confirmed page after a short delay
            setTimeout(() => {
              navigate('/email-confirmed', { replace: true });
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Email confirmation completed but session creation failed. Please try signing in manually.');
          }
        } else if (token_hash) {
          // Handle token hash verification
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email'
          });

          if (error) {
            console.error('OTP verification error:', error);
            setStatus('error');
            setMessage('Email confirmation failed. The link may be expired or invalid.');
            return;
          }

          if (data.session) {
            setStatus('success');
            setMessage('Email confirmed successfully!');
            
            toast({
              title: "Email Confirmed!",
              description: "Your account has been verified successfully.",
            });
            
            setTimeout(() => {
              navigate('/email-confirmed', { replace: true });
            }, 2000);
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Missing required parameters.');
        }
      } else if (type === 'recovery' || type === 'password_recovery') {
        // Handle password recovery
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (error) {
            console.error('Password recovery session error:', error);
            setStatus('error');
            setMessage('Password reset link is invalid or expired. Please request a new one.');
            return;
          }

          setStatus('success');
          setMessage('Password reset link verified! Redirecting to reset password page...');
          
          setTimeout(() => {
            navigate('/reset-password', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Invalid password reset link. Please request a new one.');
        }
      } else {
        setStatus('error');
        setMessage('Invalid confirmation link type. Please check your email and try again.');
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred during confirmation. Please try again.');
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      handleEmailConfirmation();
    } else {
      toast({
        title: "Too many retries",
        description: "Please request a new confirmation email.",
        variant: "destructive"
      });
    }
  };

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

          {(status === 'error' || status === 'expired') && (
            <div className="space-y-3">
              {retryCount < 3 && (
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Confirmation
                </Button>
              )}
              
              <Button 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Return to Home
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Still having issues? Contact our support team for assistance.
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