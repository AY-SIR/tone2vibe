import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const retryRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true); // Track if component is mounted

  const checkConnection = useCallback(async () => {
    if (!mountedRef.current) return; // Stop if unmounted

    const offline = !navigator.onLine;
    if (offline) {
      setIsOffline(true);
      setConnectionQuality('offline');
      retryRef.current += 1;
      scheduleNextCheck();
      return;
    }

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
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
        setConnectionQuality(duration < 1000 ? 'good' : 'poor');
      } else {
        throw new Error('Response not ok');
      }
    } catch {
      retryRef.current += 1;
      setIsOffline(true);
      setConnectionQuality('offline');
    } finally {
      setIsCheckingConnection(false);
      scheduleNextCheck();
    }
  }, []);

  const scheduleNextCheck = () => {
    if (!mountedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const nextCheck = isOffline ? 1500 : 5000; // 1.5s if offline, 5s if online
    timeoutRef.current = setTimeout(checkConnection, nextCheck);
  };

  const handleOnline = useCallback(() => checkConnection(), [checkConnection]);
  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setConnectionQuality('offline');
    scheduleNextCheck();
  }, []);

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

  return { isOffline, isCheckingConnection, connectionQuality, lastChecked, retryCount: retryRef.current };
};
