import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>(!navigator.onLine ? 'offline' : 'good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionRestored, setConnectionRestored] = useState(false);

  const mountedRef = useRef(true);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOfflineRef = useRef(!navigator.onLine);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkInProgressRef = useRef(false);
  const failureStreakRef = useRef(0);
  const backgroundCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const verifyConnection = useCallback(async (): Promise<boolean> => {
    // First check navigator.onLine for quick detection
    if (!navigator.onLine) {
      return false;
    }

    // Strategy 1: Try API health endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // API health failed, try static file
      console.debug('API health check failed, trying static file');
    }

    // Strategy 2: Try static health file
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/health.txt', {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Static health failed
      console.debug('Static health check failed');
    }

    // Both checks failed
    return false;
  }, []);

  const checkConnection = useCallback(async (isManualRetry = false) => {
    if (!mountedRef.current) return;

    // Prevent concurrent checks unless manual retry
    if (checkInProgressRef.current && !isManualRetry) return;

    checkInProgressRef.current = true;
    setIsCheckingConnection(true);
    setLastChecked(new Date());

    const online = await verifyConnection();

    if (mountedRef.current) {
      const wasOffline = wasOfflineRef.current;

      if (online) {
        failureStreakRef.current = 0;
        setIsOffline(false);
        setRetryCount(0);
        setConnectionQuality('good');
        setStatusChecked(true);

        if (wasOffline) {
          wasOfflineRef.current = false;

          if (restoredTimerRef.current) {
            clearTimeout(restoredTimerRef.current);
          }

          setConnectionRestored(true);
          restoredTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setConnectionRestored(false);
            }
          }, 3000);
        }
      } else {
        failureStreakRef.current += 1;
        setStatusChecked(true);

        // Show offline immediately on first failure when navigator says offline
        // Otherwise wait for 2 failures to avoid false positives
        const shouldShowOffline = !navigator.onLine || failureStreakRef.current >= 2;

        if (shouldShowOffline) {
          wasOfflineRef.current = true;
          setIsOffline(true);
          setConnectionQuality('offline');
          setRetryCount(prev => prev + 1);
          setConnectionRestored(false);
        }
      }

      setIsCheckingConnection(false);
      checkInProgressRef.current = false;
    }
  }, [verifyConnection]);

  const handleOnline = useCallback(async () => {
    if (!mountedRef.current) return;

    // Quick optimistic update
    setConnectionQuality('good');
    failureStreakRef.current = 0;

    // Verify connection
    await checkConnection();
  }, [checkConnection]);

  const handleOffline = useCallback(() => {
    if (!mountedRef.current) return;

    wasOfflineRef.current = true;
    setIsOffline(true);
    setConnectionQuality('offline');
    setRetryCount(prev => prev + 1);
    setConnectionRestored(false);
    setStatusChecked(true);
    setLastChecked(new Date());
    failureStreakRef.current = 0; // Reset streak
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && wasOfflineRef.current) {
      checkConnection();
    }
  }, [checkConnection]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial check - trust navigator.onLine for immediate feedback
    const initialOnline = navigator.onLine;

    if (!initialOnline) {
      // Offline: Show offline screen immediately
      wasOfflineRef.current = true;
      setIsOffline(true);
      setConnectionQuality('offline');
      setStatusChecked(true);
    } else {
      // Online: Show app immediately
      wasOfflineRef.current = false;
      setIsOffline(false);
      setConnectionQuality('good');
      setStatusChecked(true);

      // Verify connection in background (non-blocking)
      backgroundCheckTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          verifyConnection().then(online => {
            if (mountedRef.current && !online) {
              // Background check found we're actually offline
              wasOfflineRef.current = true;
              setIsOffline(true);
              setConnectionQuality('offline');
            }
          }).catch(err => {
            console.debug('Background verification error:', err);
          });
        }
      }, 1000);
    }

    // Listen to browser events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic connectivity check every 30 seconds when offline
    checkIntervalRef.current = setInterval(() => {
      if (wasOfflineRef.current && mountedRef.current && !checkInProgressRef.current) {
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
      if (backgroundCheckTimeoutRef.current) clearTimeout(backgroundCheckTimeoutRef.current);
    };
  }, [handleOnline, handleOffline, handleVisibilityChange, checkConnection, verifyConnection]);

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