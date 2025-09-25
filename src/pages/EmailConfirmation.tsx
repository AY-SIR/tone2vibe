import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [confettiShown, setConfettiShown] = useState(false);

  const fireConfetti = () => {
    if (confettiShown) return;
    setConfettiShown(true);
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors });
    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors });
  };

  useEffect(() => {
    const handleConfirmation = async () => {
      setMessage('Confirming your email...');
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setStatus('error');
        setMessage('Invalid or expired confirmation link. Please try again.');
        return;
      }

      // Set state to success to show the checkmark
      setStatus('success');
      setMessage('Account verified! Redirecting you to the app...');
      toast({
        title: 'Email Confirmed!',
        description: 'Your account has been successfully verified.',
      });

      // Wait a moment for the checkmark to show, then fire confetti
      setTimeout(() => {
        fireConfetti();
      }, 200); // 200ms delay

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/tool', { replace: true });
      }, 3000);
    };

    handleConfirmation();
  }, [navigate, toast]);

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