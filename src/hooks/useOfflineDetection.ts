import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  // Initialize immediately based on navigator.onLine
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>(!navigator.onLine ? 'offline' : 'good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusChecked, setStatusChecked] = useState(!navigator.onLine); // Set true immediately if offline
  const [retryCount, setRetryCount] = useState(0);
  const [connectionRestored, setConnectionRestored] = useState(false);

  const retryRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOfflineRef = useRef(false);
  const checkConnectionRef = useRef<() => Promise<void>>();

  const handleRestored = useCallback(() => {
    if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    setConnectionRestored(true);
    restoredTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setConnectionRestored(false);
        // After showing restoration message, component will return null and app continues normally
      }
    }, 2000);
  }, []);

  const scheduleNextCheck = useCallback((offline: boolean) => {
    if (!mountedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const nextCheck = offline ? 5000 : 30000; // Check every 5s if offline, 30s if online
    timeoutRef.current = setTimeout(() => {
      checkConnectionRef.current?.();
    }, nextCheck);
  }, []);

  const checkConnection = useCallback(async (isManualRetry = false) => {
    if (!mountedRef.current) return;

    // Allow manual retry to bypass the checking guard
    if (isCheckingConnection && !isManualRetry) return;

    if (!navigator.onLine) {
      wasOfflineRef.current = true;
      setIsOffline(true);
      setConnectionQuality('offline');
      retryRef.current += 1;
      setRetryCount(retryRef.current);
      setStatusChecked(true);
      setConnectionRestored(false);
      setIsCheckingConnection(false);
      scheduleNextCheck(true);
      return;
    }

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout for weak networks
      const start = Date.now();

      const response = await fetch(`/api/health?ts=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - start;

      if (response.ok) {
        const shouldShowRestored = wasOfflineRef.current && statusChecked;

        setIsOffline(false);
        retryRef.current = 0;
        setRetryCount(0);
        setConnectionQuality(duration < 2000 ? 'good' : 'poor');

        if (shouldShowRestored) {
          handleRestored();
          wasOfflineRef.current = false;
        }

        scheduleNextCheck(false);
      } else {
        throw new Error('Response not ok');
      }
    } catch (error) {
      wasOfflineRef.current = true;
      retryRef.current += 1;
      setRetryCount(retryRef.current);
      setIsOffline(true);
      setConnectionQuality('offline');
      setConnectionRestored(false);
      scheduleNextCheck(true);
    } finally {
      setIsCheckingConnection(false);
      setStatusChecked(true);
    }
  }, [isCheckingConnection, scheduleNextCheck, handleRestored, statusChecked]);

  useEffect(() => {
    checkConnectionRef.current = checkConnection;
  }, [checkConnection]);

  const handleOnline = useCallback(() => {
    checkConnection(true);
  }, [checkConnection]);

  const handleOffline = useCallback(() => {
    wasOfflineRef.current = true;
    setIsOffline(true);
    setConnectionQuality('offline');
    retryRef.current += 1;
    setRetryCount(retryRef.current);
    setConnectionRestored(false);
    setStatusChecked(true);
    scheduleNextCheck(true);
  }, [scheduleNextCheck]);

  useEffect(() => {
    mountedRef.current = true;

    // Set initial offline state immediately
    if (!navigator.onLine) {
      wasOfflineRef.current = true;
      setIsOffline(true);
      setStatusChecked(true);
    }

    // Then do the full check
    checkConnectionRef.current?.();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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