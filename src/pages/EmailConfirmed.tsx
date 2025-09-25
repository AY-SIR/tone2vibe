import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function EmailConfirmed() {
  const navigate = useNavigate();

  // This page is only shown after a successful confirmation.
  // Its only job is to show a success message and redirect.
  useEffect(() => {
    const timer = setTimeout(() => {
      // Use navigate for a smooth, client-side redirect
      navigate('/tool', { replace: true });
    }, 3000); // Redirect after 3 seconds

    // Cleanup the timer if the component is unmounted
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">
              Account Verified!
            </h1>
            <p className="text-muted-foreground">
              Your email has been successfully confirmed. Redirecting you to the app...
            </p>
          </div>

          <Button 
            onClick={() => navigate('/tool', { replace: true })}
            className="w-full"
          >
            Go to App Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
