import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleConfirmation = async () => {
      setMessage('Confirming your email...');

      // ✅ Just check if we have a valid session
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setStatus('error');
        setMessage(
          'Invalid or expired confirmation link. Please try again.'
        );
        return;
      }

      // ✅ Success
      setStatus('success');
      setMessage('Account verified! Redirecting you to the app...');
      toast({
        title: 'Email Confirmed!',
        description: 'Your account has been successfully verified.',
      });

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
      <Card className="w-full max-w-md">
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
