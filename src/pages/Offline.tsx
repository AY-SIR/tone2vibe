import React from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

const Offline = () => {
  const {
    isOffline,
    isCheckingConnection,
    connectionRestored,
    checkConnection
  } = useOfflineDetection();

  const handleRetry = () => {
    checkConnection(true);
  };

  // Show connection restored message briefly, then hide
  if (connectionRestored && !isOffline) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center animate-pulse">
            <Wifi className="h-10 w-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Connection Restored!</h1>
            <p className="text-muted-foreground">
              Resuming application...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if online and not in restoration phase
  if (!isOffline && !connectionRestored) {
    return null;
  }

  // Show offline screen
  if (isOffline) {
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
                No internet connection detected. Please check your network.
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
              The app will automatically reconnect when your connection is restored.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Offline;