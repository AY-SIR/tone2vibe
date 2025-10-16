import { useState, useEffect, useCallback } from 'react';

interface OfflineDetectionResult {
  isOffline: boolean;
  isCheckingConnection: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
  lastChecked: Date | null;
  retryCount: number;
}

export const useOfflineDetection = (): OfflineDetectionResult => {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = useCallback(async (isRetry = false) => {
    if (!navigator.onLine) {
      // silent offline detection
      setIsOffline(true);
      setConnectionQuality('offline');
      return;
    }

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // 👇 You can replace /api/health with your backend endpoint if needed
      const response = await fetch(`/api/health?ts=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'omit',
        headers: { 'cache-control': 'no-store' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setIsOffline(false);
        setRetryCount(0);
        setConnectionQuality('good');
      } else {
        throw new Error('Response not ok');
      }
    } catch {
      // silent fail (no console.log)
      if (isRetry) setRetryCount(prev => prev + 1);
      // keep app online, just mark quality as poor instead of offline
      setConnectionQuality('poor');
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  const handleOnline = useCallback(() => {
    checkConnection(true);
  }, [checkConnection]);

  const handleOffline = useCallback(() => {
    // don’t show anything visible, just update internal state silently
    setIsOffline(true);
    setConnectionQuality('offline');
  }, []);

  useEffect(() => {
    checkConnection();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      if (!isCheckingConnection) {
        checkConnection(true);
      }
    }, isOffline ? 10000 : 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection, handleOnline, handleOffline, isCheckingConnection, isOffline]);

  // ✅ No visible effect on frontend — just background data
  return {
    isOffline,
    isCheckingConnection,
    connectionQuality,
    lastChecked,
    retryCount,
  };
};
