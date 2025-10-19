import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import confetti from 'canvas-confetti';

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email, please wait...');

  const confettiFired = useRef(false);

  const fireConfetti = () => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors });
    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors });
  };

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid confirmation link. No token provided.');
        toast.error('Invalid confirmation link');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('verify_email_token', {
          p_token: token
        });

        if (error || !data) {
          console.error('Token verification error:', error);
          setStatus('error');
          setMessage('Invalid or expired confirmation link.');
          toast.error('Email confirmation failed');
          return;
        }

        const result = typeof data === 'string' ? JSON.parse(data) : data;

        if (!result.success) {
          setStatus('error');
          setMessage(result.error || 'Invalid or expired confirmation link.');
          toast.error('Email confirmation failed');
          return;
        }

        const { data: { user }, error: updateError } = await supabase.auth.admin.updateUserById(
          result.user_id,
          { email_confirmed_at: new Date().toISOString() }
        );

        if (updateError) {
          console.error('User update error:', updateError);
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: ''
        });

        setStatus('success');
        setMessage('Email confirmed successfully! Redirecting...');
        toast.success('Email Confirmed!', {
          description: 'Your account has been successfully verified.',
        });

        setTimeout(fireConfetti, 200);

        setTimeout(() => {
          navigate('/tool', { replace: true });
        }, 3000);

      } catch (err) {
        console.error('Verification exception:', err);
        setStatus('error');
        setMessage('An error occurred during confirmation.');
        toast.error('Email confirmation failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

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
