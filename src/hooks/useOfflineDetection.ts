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
    // Check localStorage for persistent offline state
    const storedOfflineState = localStorage.getItem('offline-state');
    return storedOfflineState === 'true' || !navigator.onLine;
  });
  
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = useCallback(async (isRetry = false) => {
    if (!navigator.onLine) {
      setIsOffline(true);
      setConnectionQuality('offline');
      localStorage.setItem('offline-state', 'true');
      return;
    }

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const start = Date.now();
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const duration = Date.now() - start;
      
      if (response.ok) {
        setIsOffline(false);
        localStorage.removeItem('offline-state');
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
      localStorage.setItem('offline-state', 'true');
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
    localStorage.setItem('offline-state', 'true');
  }, []);

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic connection checks (more aggressive when offline)
    const checkInterval = isOffline ? 5000 : 15000; // Check every 5s if offline, 15s if online
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