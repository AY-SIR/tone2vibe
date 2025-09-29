// src/pages/EmailConfirmation.tsx

import React, 'react';
import { useEffect, useState, useRef } from 'react'; // Import useRef
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner"; // Using sonner as per your other components
import confetti from 'canvas-confetti';

export default function EmailConfirmation() {
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email, please wait...');
  
  // Use a ref to prevent multiple confetti fires
  const confettiFired = useRef(false);

  const fireConfetti = () => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors });
    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors });
  };

  useEffect(() => {
    // Set a timeout to handle cases where the auth state never changes (e.g., invalid link)
    const timeoutId = setTimeout(() => {
      setStatus('error');
      setMessage('Invalid or expired confirmation link. Please request a new confirmation.');
    }, 10000); // 10-second timeout

    // The correct way: listen for the SIGNED_IN event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // This listener runs when Supabase has processed the auth event from the URL
      if (event === 'SIGNED_IN' && session) {
        clearTimeout(timeoutId); // We got a sign-in, so clear the error timeout

        setStatus('success');
        setMessage('Account verified! Redirecting you to the app...');
        toast.success('Email Confirmed!', {
          description: 'Your account has been successfully verified.',
        });

        // Fire confetti after a brief delay
        setTimeout(fireConfetti, 200);

        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/tool', { replace: true });
        }, 3000);
      }
    });

    // Cleanup function to unsubscribe from the listener when the component unmounts
    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);


  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-destructive" />;
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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">{getIcon()}</div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{getTitle()}</h1>
            <p className="text-muted-foreground">{message}</p>
          </div>
          {status === 'error' && (
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
