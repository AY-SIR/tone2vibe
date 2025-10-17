import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>(
    navigator.onLine ? 'good' : 'offline'
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retryRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const checkConnection = useCallback(async () => {
    if (!mountedRef.current) return;

    const offline = !navigator.onLine;

    if (offline) {
      setIsOffline(true);
      setConnectionQuality('offline');
      retryRef.current += 1;
      setRetryCount(retryRef.current);
      scheduleNextCheck(true);
      return;
    }

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
      const start = Date.now();

      const response = await fetch(`/api/health?ts=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - start;

      if (response.ok) {
        setIsOffline(false);
        retryRef.current = 0;
        setRetryCount(0);
        setConnectionQuality(duration < 1000 ? 'good' : 'poor');
      } else {
        throw new Error('Response not ok');
      }
    } catch {
      retryRef.current += 1;
      setRetryCount(retryRef.current);
      setIsOffline(true);
      setConnectionQuality('offline');
    } finally {
      setIsCheckingConnection(false);
      scheduleNextCheck(!navigator.onLine || retryRef.current > 0);
    }
  }, []);

  const scheduleNextCheck = useCallback((offline: boolean) => {
    if (!mountedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const nextCheck = offline ? 1500 : 5000;
    timeoutRef.current = setTimeout(checkConnection, nextCheck);
  }, [checkConnection]);

  const handleOnline = useCallback(() => checkConnection(), [checkConnection]);
  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setConnectionQuality('offline');
    retryRef.current += 1;
    setRetryCount(retryRef.current);
    scheduleNextCheck(true);
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

  return { isOffline, isCheckingConnection, connectionQuality, lastChecked, retryCount };
};
