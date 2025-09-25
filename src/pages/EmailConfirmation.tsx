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
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'already_confirmed'>('loading');
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

      // Check for errors first
      if (error_code) {
        setStatus('error');
        
        if (error_code === 'signup_disabled') {
          setMessage('Account registration is currently disabled. Please try again later.');
        } else if (error_code === 'email_not_confirmed') {
          setMessage('Email confirmation failed. Please check your email and try clicking the confirmation link again.');
        } else if (error_code === 'invalid_request') {
          setMessage('Invalid confirmation link. Please request a new confirmation email.');
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
            
            if (error.message.includes('expired')) {
              setStatus('expired');
              setMessage('This confirmation link has expired. Please request a new confirmation email.');
            } else if (error.message.includes('invalid')) {
              setStatus('error');
              setMessage('Invalid confirmation link. Please check your email and try again.');
            } else if (error.message.includes('already_confirmed')) {
              setStatus('already_confirmed');
              setMessage('Your email is already confirmed. You can sign in to your account.');
            } else {
              setStatus('error');
              setMessage('Failed to confirm email. Please try again or contact support.');
            }
            return;
          }

          if (data.session && data.user) {
            setStatus('success');
            setMessage('Email confirmed successfully! Your account is now active.');
            
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
            setMessage('Email confirmed but login failed. Please try signing in with your credentials.');
          }
        } else if (token_hash) {
          // Handle token hash verification
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email'
          });

          if (error) {
            if (error.message.includes('expired')) {
              setStatus('expired');
              setMessage('This confirmation link has expired. Please request a new confirmation email.');
            } else {
              setStatus('error');
              setMessage('Email confirmation failed. The link may be expired or invalid.');
            }
            return;
          }

          if (data.session) {
            setStatus('success');
            setMessage('Email confirmed successfully! Your account is now active.');
            
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
          setMessage('Invalid confirmation link. Please check your email and try clicking the link again.');
        }
      } else if (type === 'recovery' || type === 'password_recovery') {
        // Handle password recovery
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (error) {
            setStatus('error');
            setMessage('Password reset link has expired. Please request a new password reset email.');
            return;
          }

          setStatus('success');
          setMessage('Reset link verified! Redirecting to password reset page...');
          
          setTimeout(() => {
            navigate('/reset-password', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Invalid password reset link. Please request a new reset email.');
        }
      } else {
        setStatus('error');
        setMessage('Invalid link type. Please check your email and try clicking the correct link.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong during confirmation. Please try again or contact support.');
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
      case 'already_confirmed':
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
      case 'already_confirmed':
        return 'Already Confirmed';
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

          {(status === 'error' || status === 'expired' || status === 'already_confirmed') && (
            <div className="space-y-3">
              {retryCount < 3 && status !== 'already_confirmed' && (
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Confirmation
                </Button>
              )}
              
              {status === 'already_confirmed' && (
                <Button 
                  onClick={() => navigate('/?auth=open')}
                  className="w-full"
                >
                  Sign In to Your Account
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