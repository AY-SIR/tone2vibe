import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

const Offline = () => {
  const { isCheckingConnection, checkConnection } = useOfflineDetection();


  const handleRetry = async () => {
    await checkConnection(true);
  };


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
            disabled={isCheckingConnection}
            className="w-full"
          >
            {isCheckingConnection ? (
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
            The page will automatically refresh when your connection is restored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Offline;