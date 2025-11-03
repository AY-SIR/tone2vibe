import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Offline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setChecking(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-store'
      });
      
      if (response.ok) {
        setIsOnline(true);
      }
    } catch (error) {
      // Still offline
    } finally {
      setChecking(false);
    }
  };

  if (isOnline) {
   return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <RefreshCw className="h-10 w-10 text-green-600 animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Connection Restored</h1>
            <p className="text-muted-foreground">
              Reconnecting to the application...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">You're Offline</h1>
            <p className="text-muted-foreground">
              It looks like you've lost your internet connection. Please check your network and try again.
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={handleRetry}
            disabled={checking}
            className="w-full"
          >
            {checking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking Connection...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            The app will automatically reconnect when your connection is restored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Offline;
