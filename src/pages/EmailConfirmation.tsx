// src/pages/EmailConfirmation.jsx
// THIS IS THE COMPLETE, FULL FILE.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Please wait while we verify your email...');

  // Effect 1: Handles the email confirmation logic
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const errorDescription = params.get('error_description');

        if (errorDescription) {
          setStatus('expired');
          const decodedMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
          setMessage(`Link is invalid or has expired. Error: ${decodedMessage}`);
          return;
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setStatus('error');
            setMessage('Failed to set your session. Please try logging in.');
          } else {
            setStatus('success');
            setMessage('Email confirmed successfully! Redirecting...');
          }
          return;
        }
        
        setStatus('error');
        setMessage('Invalid confirmation link. Necessary information is missing.');

      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, []); // Runs only once

  // Effect 2: Handles the redirect logic after success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        navigate('/email-confirmed', { replace: true });
      }, 2000); 

      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  // --- UI HELPER FUNCTIONS ---
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
        return 'Link Expired or Invalid';
      default:
        return 'Processing...';
    }
  };

  // --- RENDER JSX ---
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
