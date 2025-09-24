// src/pages/EmailConfirmed.jsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function EmailConfirmed() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/tool', { replace: true });
    }, 5000); // Redirect to tool after 5 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-green-600">Welcome!</h1>
            <p className="text-lg font-medium">Your email has been confirmed successfully!</p>
            <p className="text-muted-foreground">You are now logged in and ready to go.</p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/tool', { replace: true })} 
              className="w-full text-lg py-6"
              size="lg"
            >
              Go to the Tool
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Automatically redirecting in 5 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
