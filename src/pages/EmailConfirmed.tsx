import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Mic, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmailConfirmed() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate('/tool', { replace: true });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-green-600" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Mic className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-green-600">
              Welcome to Tone2Vibe!
            </h1>
            
            <p className="text-lg font-medium">
              Your email has been confirmed successfully!
            </p>
            
            <p className="text-muted-foreground">
              You're all set to start using our voice tone conversion tool. 
              Let's transform your audio content with AI-powered tone adjustments.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/tool', { replace: true })} 
              className="w-full text-lg py-6"
              size="lg"
            >
              Start Using Tone2Vibe
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Automatically redirecting in 5 seconds...
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl">🎵</div>
                <p className="text-xs text-muted-foreground">Voice Conversion</p>
              </div>
              <div className="space-y-1">
                <div className="text-2xl">🎯</div>
                <p className="text-xs text-muted-foreground">Tone Adjustment</p>
              </div>
              <div className="space-y-1">
                <div className="text-2xl">⚡</div>
                <p className="text-xs text-muted-foreground">AI Powered</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
