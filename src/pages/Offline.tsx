import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

const Offline = () => {
  const {
    isOffline,
    isCheckingConnection,
    connectionRestored,
    statusChecked,
    checkConnection
  } = useOfflineDetection();

  const [showRestored, setShowRestored] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (connectionRestored && !isOffline) {
      setShowRestored(true);
      setCountdown(4);

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const fadeOutTimer = setTimeout(() => {
        setIsAnimatingOut(true);
      }, 3800);

      const removeTimer = setTimeout(() => {
        setShowRestored(false);
        setIsAnimatingOut(false);
        setCountdown(4);
      }, 4300);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(fadeOutTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [connectionRestored, isOffline]);

  const handleRetry = async () => {
    await checkConnection(true);
  };

  // Show loading while checking initial status
  if (!statusChecked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Checking connection...</p>
        </div>
      </div>
    );
  }

  // Show connection restored message
  if (showRestored) {
    return (
      <div
        className={`fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center transition-all duration-700 ${
          isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div className="max-w-md w-full text-center space-y-6 p-6 animate-fade-in animate-scale-in">
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 flex items-center justify-center shadow-2xl shadow-green-500/50">
            <Wifi className="h-14 w-14 text-white animate-pulse" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-600 bg-clip-text text-transparent">
              Back Online!
            </h1>
            <p className="text-xl text-muted-foreground">
              Resuming in <span className="font-bold text-2xl text-foreground tabular-nums">{countdown}</span>s
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show offline screen
  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
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

  // Don't show anything if online (App.tsx will handle routing)
  return null;
};

export default Offline;