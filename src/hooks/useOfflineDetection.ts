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

  const handleRestored = useCallback(() => {
    if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    setConnectionRestored(true);
    restoredTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setConnectionRestored(false);
      }
    }, 4500);
  }, []);

  const checkConnection = useCallback(async (isManualRetry = false) => {
    if (!mountedRef.current) return;
    if (isCheckingConnection && !isManualRetry) return;

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    // Use navigator.onLine for immediate feedback
    const online = navigator.onLine;

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

  const handleOnline = useCallback(() => {
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
      const isCurrentlyOnline = navigator.onLine;
      setIsOffline(!isCurrentlyOnline);
      setStatusChecked(true);
      wasOfflineRef.current = !isCurrentlyOnline;
      initialCheckDone.current = true;
    }

    // Listen to browser events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    };
  }, [handleOnline, handleOffline]);

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