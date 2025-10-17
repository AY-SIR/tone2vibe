import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const retryRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const checkConnection = useCallback(async () => {
    if (!mountedRef.current) return;

    if (!navigator.onLine) {
      retryRef.current += 1;
      if (retryRef.current > 2) {
        setIsOffline(true);
        setConnectionQuality('offline');
      }
      scheduleNextCheck();
      return;
    }

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      const start = Date.now();

      const response = await fetch(`/api/health?ts=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - start;

      if (response.ok) {
        retryRef.current = 0;
        setIsOffline(false);
        setConnectionQuality(duration < 1000 ? 'good' : 'poor');
      } else {
        throw new Error('Response not ok');
      }
    } catch {
      retryRef.current += 1;
      if (retryRef.current > 2) { // 3 consecutive failures = offline
        setIsOffline(true);
        setConnectionQuality('offline');
      } else {
        setConnectionQuality('poor'); // slow or hiccup
      }
    } finally {
      setIsCheckingConnection(false);
      scheduleNextCheck();
    }
  }, []);

  const scheduleNextCheck = useCallback(() => {
    if (!mountedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const nextCheck = isOffline ? 2000 : 5000; // faster if offline
    timeoutRef.current = setTimeout(checkConnection, nextCheck);
  }, [checkConnection, isOffline]);

  const handleOnline = useCallback(() => checkConnection(), [checkConnection]);
  const handleOffline = useCallback(() => {
    retryRef.current += 1;
    if (retryRef.current > 2) {
      setIsOffline(true);
      setConnectionQuality('offline');
    }
    scheduleNextCheck();
  }, [scheduleNextCheck]);

  useEffect(() => {
    mountedRef.current = true;
    checkConnection();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checkConnection, handleOnline, handleOffline]);

  return { isOffline, isCheckingConnection, connectionQuality, lastChecked };
};
