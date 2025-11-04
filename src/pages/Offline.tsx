import React, { useEffect, useState } from 'react';
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

  const [showRestored, setShowRestored] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (connectionRestored && !isOffline) {
      setShowRestored(true);
      setCountdown(4);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start fade out animation after 4 seconds
      const fadeOutTimer = setTimeout(() => {
        setIsAnimatingOut(true);
      }, 4000);

      // Remove component after animation completes
      const removeTimer = setTimeout(() => {
        setShowRestored(false);
        setIsAnimatingOut(false);
        setCountdown(4);
      }, 4500); // 4000ms display + 500ms fade out

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

  // Show connection restored message with smooth transition
  if (showRestored) {
    return (
      <div
        className={`fixed inset-0 z-[9999] bg-background flex items-center justify-center transition-opacity duration-500 ${
          isAnimatingOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className={`max-w-md w-full text-center space-y-6 p-4 transition-transform duration-500 ${
          isAnimatingOut ? 'scale-95' : 'scale-100'
        }`}>
          <div className="w-24 h-24 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Wifi className="h-12 w-12 text-green-600 animate-pulse" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold">Connection Restored!</h1>
            <p className="text-lg text-muted-foreground">
              Resuming in <span className="font-semibold text-foreground">{countdown}</span> second{countdown !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if online and not showing restored message
  if (!isOffline) {
    return null;
  }

  // Show offline screen with fade-in animation
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full text-center space-y-8 animate-in slide-in-from-bottom-4 duration-500">
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
};

export default Offline;