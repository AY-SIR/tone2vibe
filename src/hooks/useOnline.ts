import { useEffect, useState, useCallback } from "react";

export default function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() => {
    // Check if we have a stored offline state first
    const storedOfflineState = localStorage.getItem('offline-state');
    if (storedOfflineState === 'true') {
      return false;
    }
    return navigator.onLine;
  });

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setOnline(false);
      localStorage.setItem('offline-state', 'true');
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setOnline(true);
        localStorage.removeItem('offline-state');
        return true;
      } else {
        setOnline(false);
        localStorage.setItem('offline-state', 'true');
        return false;
      }
    } catch (error) {
      setOnline(false);
      localStorage.setItem('offline-state', 'true');
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      // When browser reports online, verify with actual network request
      checkConnection();
    };

    const handleOffline = () => {
      setOnline(false);
      localStorage.setItem('offline-state', 'true');
    };

    // Initial connection check
    checkConnection();

    // Set up periodic connection checks
    const interval = setInterval(checkConnection, 10000);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection]);

  return online;
}
