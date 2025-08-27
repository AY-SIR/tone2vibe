
import { useState, useEffect } from 'react';

export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) {
        setConnectionQuality('offline');
      }
    };

    const checkConnectionQuality = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }

      try {
        const start = Date.now();
        await fetch('/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const duration = Date.now() - start;
        
        setConnectionQuality(duration < 1000 ? 'good' : 'poor');
      } catch {
        setConnectionQuality('poor');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check connection quality every 30 seconds
    const qualityCheck = setInterval(checkConnectionQuality, 30000);
    checkConnectionQuality(); // Initial check

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(qualityCheck);
    };
  }, []);

  return { isOnline, connectionQuality };
};
