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
  const initialCheckDone = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRestored = useCallback(() => {
    if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    setConnectionRestored(true);
    restoredTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setConnectionRestored(false);
      }
    }, 4500);
  }, []);

  const verifyConnection = async (): Promise<boolean> => {
    // First check navigator.onLine for quick detection
    if (!navigator.onLine) {
      return false;
    }

    // Verify actual server connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
      return response.ok && response.status === 200;
    } catch (error) {
      console.log('Connection check failed:', error);
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
    // Double-check with server before marking as online
    const online = await verifyConnection();

    if (online && mountedRef.current) {
      const shouldShowRestored = wasOfflineRef.current;

      setIsOffline(false);
      setConnectionQuality('good');
      setRetryCount(0);
      setConnectionRestored(false);
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

  useEffect(() => {
    mountedRef.current = true;

    // Immediate initial check
    if (!initialCheckDone.current) {
      initialCheckDone.current = true;
      checkConnection();
    }

    // Listen to browser events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [handleOnline, handleOffline, checkConnection]);

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