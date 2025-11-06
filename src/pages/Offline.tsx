import React, { useState } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Offline = () => {
  const [checking, setChecking] = useState(false);

  const checkConnection = async () => {
    setChecking(true);

    try {
      // Try API health endpoint first
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Connection is back - the hook will automatically navigate away
        // Just stop the checking state
        setChecking(false);
        return;
      }
    } catch (apiError) {
      // API failed, try static health file
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/health.txt', {
          method: 'HEAD',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Connection is back - the hook will automatically navigate away
          setChecking(false);
          return;
        }
      } catch (staticError) {
        // Both checks failed - still offline
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-6">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>

          {/* Title and Description */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">You're Offline</h1>
            <p className="text-muted-foreground text-base">
              It looks like you've lost your internet connection. Please check your network settings and try again.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            onClick={checkConnection}
            disabled={checking}
            className="w-full"
            size="lg"
          >
            {checking ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Checking Connection...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </>
            )}
          </Button>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Connection will be automatically detected when restored.
          </p>
        </div>

        {/* Troubleshooting tips */}
        <div className="pt-6 border-t">
          <details className="text-left">
            <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Troubleshooting Tips
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Wifi className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Check if your WiFi or mobile data is turned on</span>
              </li>
              <li className="flex items-start gap-2">
                <Wifi className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Try switching between WiFi and mobile data</span>
              </li>
              <li className="flex items-start gap-2">
                <Wifi className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Restart your router or modem</span>
              </li>
              <li className="flex items-start gap-2">
                <Wifi className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Check if other devices can connect to the internet</span>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
};

export default Offline;