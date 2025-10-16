
import { useState, useEffect, useCallback } from 'react';

export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(() => {
    // Check localStorage for persistent offline state
    const storedOfflineState = localStorage.getItem('offline-state');
    return storedOfflineState !== 'true' && navigator.onLine;
  });
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const checkConnectionQuality = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setConnectionQuality('offline');
      localStorage.setItem('offline-state', 'true');
      return;
    }

    setIsCheckingConnection(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const start = Date.now();
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const duration = Date.now() - start;
      
      if (response.ok) {
        setIsOnline(true);
        localStorage.removeItem('offline-state');
        
        if (duration < 1000) {
          setConnectionQuality('good');
        } else if (duration < 3000) {
          setConnectionQuality('poor');
        } else {
          setConnectionQuality('poor');
        }
      } else {
        setIsOnline(false);
        setConnectionQuality('offline');
        localStorage.setItem('offline-state', 'true');
      }
    } catch (error) {
      console.log('Connection check failed:', error);
      setIsOnline(false);
      setConnectionQuality('offline');
      localStorage.setItem('offline-state', 'true');
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        setConnectionQuality('offline');
        localStorage.setItem('offline-state', 'true');
      } else {
        // When browser reports online, verify with actual network request
        checkConnectionQuality();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial connection check
    checkConnectionQuality();

    // Check connection quality every 15 seconds
    const qualityCheck = setInterval(checkConnectionQuality, 15000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(qualityCheck);
    };
  }, [checkConnectionQuality]);

  return { 
    isOnline, 
    connectionQuality, 
    isCheckingConnection 
  };
};
