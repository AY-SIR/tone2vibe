import { useState, useEffect, useCallback } from 'react';

interface OfflineDetectionResult {
  isOffline: boolean;
  isCheckingConnection: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
  lastChecked: Date | null;
  retryCount: number;
}

export const useOfflineDetection = (): OfflineDetectionResult => {
  const [isOffline, setIsOffline] = useState(() => {
    // Always start with navigator.onLine, don't rely on localStorage for initial state
    return !navigator.onLine;
  });
  
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = useCallback(async (isRetry = false) => {
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
      // Perform a cache-busted, network-only style check to avoid SW caches
      const healthUrl = `/api/health?ts=${Date.now()}`;
      const response = await fetch(healthUrl, {
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          'cache-control': 'no-store'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const duration = Date.now() - start;
      
      if (response.ok) {
        setIsOffline(false);
        setRetryCount(0);
        
        if (duration < 1000) {
          setConnectionQuality('good');
        } else if (duration < 3000) {
          setConnectionQuality('poor');
        } else {
          setConnectionQuality('poor');
        }
      } else {
        throw new Error('Response not ok');
      }
    } catch (error) {
      console.log('Connection check failed:', error);
      
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
      
      setIsOffline(true);
      setConnectionQuality('offline');
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  const handleOnline = useCallback(() => {
    // When browser reports online, verify with actual network request
    checkConnection(true);
  }, [checkConnection]);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setConnectionQuality('offline');
  }, []);

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic connection checks (more aggressive when offline)
    const checkInterval = isOffline ? 10000 : 30000; // Check every 10s if offline, 30s if online
    const interval = setInterval(() => {
      if (!isCheckingConnection) {
        checkConnection(true);
      }
    }, checkInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection, handleOnline, handleOffline, isCheckingConnection, isOffline]);

  return {
    isOffline,
    isCheckingConnection,
    connectionQuality,
    lastChecked,
    retryCount
  };
};