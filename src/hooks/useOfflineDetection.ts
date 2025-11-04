import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  // Start with navigator.onLine to avoid white screen
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>(!navigator.onLine ? 'offline' : 'good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusChecked, setStatusChecked] = useState(!navigator.onLine); // If offline, we already know the status
  const [retryCount, setRetryCount] = useState(0);
  const [connectionRestored, setConnectionRestored] = useState(false);

  const mountedRef = useRef(true);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOfflineRef = useRef(!navigator.onLine);
  const initialCheckDone = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRestoringRef = useRef(false);

  const handleRestored = useCallback(() => {
    if (isRestoringRef.current) return;
    if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);

    isRestoringRef.current = true;
    setConnectionRestored(true);

    restoredTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setConnectionRestored(false);
        isRestoringRef.current = false;
      }
    }, 5000);
  }, []);

  const verifyConnection = async (): Promise<boolean> => {
    // First check navigator.onLine for quick detection
    if (!navigator.onLine) {
      return false;
    }

    // Strategy 1: Try health endpoint (for localhost/custom backends)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (response.ok && response.status === 200) {
        return true;
      }
    } catch (error) {
      // Health endpoint failed, try fallback
    }

    // Strategy 2: Try static health file (for production/static hosting)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('/health.txt', {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Static file failed, try main domain
    }

    // Strategy 3: Check if we can fetch from our own domain
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(window.location.origin, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.status < 500;
    } catch (error) {
      // Own domain failed
    }

    // Strategy 4: External connectivity check (last resort)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      await fetch('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  };

  const checkConnection = useCallback(async (isManualRetry = false) => {
    if (!mountedRef.current) return;
    if (isCheckingConnection && !isManualRetry) return;

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    const online = await verifyConnection();

    if (mountedRef.current) {
      if (online) {
        const shouldShowRestored = wasOfflineRef.current;

        setIsOffline(false);
        setRetryCount(0);
        setConnectionQuality('good');
        setStatusChecked(true);

        if (shouldShowRestored) {
          handleRestored();
          wasOfflineRef.current = false;
        }
      } else {
        wasOfflineRef.current = true;
        setIsOffline(true);
        setConnectionQuality('offline');
        setRetryCount(prev => prev + 1);
        setConnectionRestored(false);
        setStatusChecked(true);
      }

      setIsCheckingConnection(false);
    }
  }, [isCheckingConnection, handleRestored]);

  const handleOnline = useCallback(async () => {
    // Quick optimistic update
    if (mountedRef.current) {
      setIsOffline(false);
      setConnectionQuality('good');
      setStatusChecked(true);
    }

    // Verify in background
    const online = await verifyConnection();

    if (online && mountedRef.current) {
      const shouldShowRestored = wasOfflineRef.current;

      setIsOffline(false);
      setConnectionQuality('good');
      setRetryCount(0);
      setStatusChecked(true);
      setLastChecked(new Date());

      if (shouldShowRestored) {
        handleRestored();
        wasOfflineRef.current = false;
      }
    }
  }, [handleRestored]);

  const handleOffline = useCallback(() => {
    wasOfflineRef.current = true;
    setIsOffline(true);
    setConnectionQuality('offline');
    setRetryCount(prev => prev + 1);
    setConnectionRestored(false);
    setStatusChecked(true);
    setLastChecked(new Date());
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && wasOfflineRef.current) {
      checkConnection();
    }
  }, [checkConnection]);

  useEffect(() => {
    mountedRef.current = true;

    // Immediate initial check based on navigator.onLine
    if (!initialCheckDone.current) {
      initialCheckDone.current = true;

      if (!navigator.onLine) {
        // Offline: Show offline screen immediately
        wasOfflineRef.current = true;
        setIsOffline(true);
        setConnectionQuality('offline');
        setStatusChecked(true);
      } else {
        // Online: Trust navigator and show app immediately
        setIsOffline(false);
        setStatusChecked(true);
        setConnectionQuality('good');

        // Verify in background without blocking UI
        checkConnection();
      }
    }

    // Listen to browser events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic connectivity check every 30 seconds when offline
    checkIntervalRef.current = setInterval(() => {
      if (wasOfflineRef.current && mountedRef.current) {
        checkConnection();
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [handleOnline, handleOffline, handleVisibilityChange, checkConnection]);

  return {
    isOffline,
    isCheckingConnection,
    connectionQuality,
    lastChecked,
    retryCount,
    statusChecked,
    connectionRestored,
    checkConnection
  };
};