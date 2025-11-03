import { useState, useEffect, useCallback, useRef } from 'react';

export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // --- NEW ---
  const [connectionRestored, setConnectionRestored] = useState(false);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // --- END NEW ---

  const retryRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Use a ref for checkConnection to avoid stale closures in setTimeout
  const checkConnectionRef = useRef<() => Promise<void>>();

  // --- NEW: Handle restored message ---
  const handleRestored = useCallback(() => {
    if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    setConnectionRestored(true);
    restoredTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setConnectionRestored(false);
      }
    }, 2000); // Show "Restored" for 2 seconds
  }, []);

  const scheduleNextCheck = useCallback((offline: boolean) => {
    if (!mountedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const nextCheck = offline ? 3000 : 5000; // Check more frequently if offline
    timeoutRef.current = setTimeout(() => {
      checkConnectionRef.current?.(); // Call the ref
    }, nextCheck);
  }, []);

  const checkConnection = useCallback(async (isManualRetry = false) => {
    if (!mountedRef.current) return;
    
    // Don't stack checks unless it's a manual retry
    if (isCheckingConnection && !isManualRetry) return;

    const wasOffline = retryRef.current > 0 || !navigator.onLine;

    if (!navigator.onLine) {
      setIsOffline(true);
      setConnectionQuality('offline');
      retryRef.current += 1;
      setRetryCount(retryRef.current);
      scheduleNextCheck(true);
      setStatusChecked(true);
      setConnectionRestored(false);
      return;
    }

    setIsCheckingConnection(true);
    setLastChecked(new Date());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
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
        
        // --- NEW ---
        if (wasOffline && statusChecked) { // Only show restored if it wasn't the first load
          handleRestored();
        }
        // --- END NEW ---
        
      } else {
        throw new Error('Response not ok');
      }
    } catch {
      retryRef.current += 1;
      setRetryCount(retryRef.current);
      setIsOffline(true);
      setConnectionQuality('offline');
      setConnectionRestored(false);
    } finally {
      setIsCheckingConnection(false);
      scheduleNextCheck(!navigator.onLine || retryRef.current > 0);
      setStatusChecked(true);
    }
  }, [isCheckingConnection, scheduleNextCheck, handleRestored, statusChecked]);
  
  // Keep the ref updated
  useEffect(() => {
    checkConnectionRef.current = checkConnection;
  }, [checkConnection]);

  const handleOnline = useCallback(() => checkConnection(true), [checkConnection]);
  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setConnectionQuality('offline');
    retryRef.current += 1;
    setRetryCount(retryRef.current);
    scheduleNextCheck(true);
    setConnectionRestored(false);
  }, [scheduleNextCheck]);

  useEffect(() => {
    mountedRef.current = true;
    checkConnectionRef.current?.(); // Initial check
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    };
  }, [handleOnline, handleOffline]);

  // --- MODIFIED RETURN ---
  return { 
    isOffline, 
    isCheckingConnection, 
    connectionQuality, 
    lastChecked, 
    retryCount, 
    statusChecked,
    connectionRestored, // <-- Export new state
    checkConnection    // <-- Export retry function
  };
};
