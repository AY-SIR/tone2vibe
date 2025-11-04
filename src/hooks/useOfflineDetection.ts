import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>(!navigator.onLine ? 'offline' : 'good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusChecked, setStatusChecked] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionRestored, setConnectionRestored] = useState(false);

  const mountedRef = useRef(true);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOfflineRef = useRef(!navigator.onLine);

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

    // Just use navigator.onLine - no fetch requests
    const online = navigator.onLine;

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

    // Set initial state based on navigator.onLine
    if (!navigator.onLine) {
      wasOfflineRef.current = true;
      setIsOffline(true);
      setStatusChecked(true);
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