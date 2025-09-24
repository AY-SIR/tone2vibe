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

  // Step 1: Yeh useEffect sirf ek baar chalega aur email confirmation handle karega.
  // HINDI: Yeh useEffect sirf email check karke status set karega (success/error).
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const errorDescription = params.get('error_description');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

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
            // SUCCESS! Sirf status set karein. Navigate yahan nahi karna hai.
            // HINDI: Safal hone par sirf status badal do. Agle page par yahan se nahi jaana hai.
            setStatus('success');
            setMessage('Email confirmed successfully! Redirecting...');
          }
          return;
        }
        
        setStatus('error');
        setMessage('Invalid confirmation link. Necessary information is missing.');

      } catch (error) {
        console.error('An unexpected error occurred during confirmation:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, []); // Empty array ensures this runs only once on mount

  // Step 2: Yeh naya useEffect status ko dekhta rahega.
  // HINDI: Yeh naya useEffect 'status' state par nazar rakhega.
  useEffect(() => {
    // Jab status 'success' hoga, tabhi yeh code chalega.
    if (status === 'success') {
      console.log("Status is success, preparing to redirect...");
      const timer = setTimeout(() => {
        navigate('/email-confirmed');
      }, 2000); // 2 second ke liye 'tick' dikhega

      // Cleanup function to clear the timer if the component unmounts
      return () => clearTimeout(timer);
    }
  }, [status, navigate]); // Yeh tabhi chalega jab 'status' ya 'navigate' badlega.

  // --- UI PART (NO CHANGES NEEDED HERE) ---
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
