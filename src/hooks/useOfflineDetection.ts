import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const retryRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOffline(true);
      setConnectionQuality('offline');
      return;
    }

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const start = Date.now();

      const response = await fetch(`/api/health?ts=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
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
    } catch (err) {
      retryRef.current += 1;
      setIsOffline(true);
      setConnectionQuality('offline');
    } finally {
      setIsCheckingConnection(false);

      // Schedule next check
      const nextCheck = isOffline ? 10000 : 30000;
      timeoutRef.current = setTimeout(checkConnection, nextCheck);
    }
  }, [isOffline]);

  const handleOnline = useCallback(() => checkConnection(), [checkConnection]);
  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setConnectionQuality('offline');
  }, []);

  useEffect(() => {
    checkConnection();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checkConnection, handleOnline, handleOffline]);

  return { isOffline, isCheckingConnection, connectionQuality, lastChecked, retryCount: retryRef.current };
};
