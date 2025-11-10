import { useState, useEffect, useCallback, useRef } from "react";

export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<
    "good" | "poor" | "offline"
  >(!navigator.onLine ? "offline" : "good");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionRestored, setConnectionRestored] = useState(false);

  const mountedRef = useRef(true);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOfflineRef = useRef(!navigator.onLine);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkInProgressRef = useRef(false);
  const failureStreakRef = useRef(0);
  const backgroundCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const verifyConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    const testUrl = async (url: string) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: "HEAD",
          cache: "no-cache",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    };

    // Step checks
    if (await testUrl("/api/health")) return true;
    if (await testUrl("/health.txt")) return true;
    if (await testUrl("https://cdnjs.cloudflare.com/cdn-cgi/trace")) return true;

    return false;
  }, []);

  const checkConnection = useCallback(
    async (isManualRetry = false) => {
      if (!mountedRef.current) return;
      if (checkInProgressRef.current && !isManualRetry) return;

      checkInProgressRef.current = true;
      setIsCheckingConnection(true);
      setLastChecked(new Date());

      const online = await verifyConnection();

      if (mountedRef.current) {
        const wasOffline = wasOfflineRef.current;

        if (online) {
          failureStreakRef.current = 0;
          setIsOffline(false);
          setRetryCount(0);
          setConnectionQuality("good");
          setStatusChecked(true);

          if (wasOffline) {
            wasOfflineRef.current = false;
            if (restoredTimerRef.current)
              clearTimeout(restoredTimerRef.current);

            setConnectionRestored(true);
            restoredTimerRef.current = setTimeout(() => {
              if (mountedRef.current) setConnectionRestored(false);
            }, 3000);
          }
        } else {
          failureStreakRef.current += 1;
          setStatusChecked(true);

          const shouldShowOffline =
            !navigator.onLine || failureStreakRef.current >= 2;

          if (shouldShowOffline) {
            wasOfflineRef.current = true;
            setIsOffline(true);
            setConnectionQuality("offline");
            setRetryCount((prev) => prev + 1);
            setConnectionRestored(false);
          }
        }

        setIsCheckingConnection(false);
        checkInProgressRef.current = false;
      }
    },
    [verifyConnection]
  );

  const handleOnline = useCallback(async () => {
    if (!mountedRef.current) return;
    setConnectionQuality("good");
    failureStreakRef.current = 0;
    await checkConnection();
  }, [checkConnection]);

  const handleOffline = useCallback(() => {
    if (!mountedRef.current) return;
    wasOfflineRef.current = true;
    setIsOffline(true);
    setConnectionQuality("offline");
    setRetryCount((prev) => prev + 1);
    setConnectionRestored(false);
    setStatusChecked(true);
    setLastChecked(new Date());
    failureStreakRef.current = 0;
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible" && wasOfflineRef.current) {
      checkConnection();
    }
  }, [checkConnection]);

  useEffect(() => {
    mountedRef.current = true;

    const initialOnline = navigator.onLine;

    if (!initialOnline) {
      wasOfflineRef.current = true;
      setIsOffline(true);
      setConnectionQuality("offline");
      setStatusChecked(true);
    } else {
      wasOfflineRef.current = false;
      setIsOffline(false);
      setConnectionQuality("good");
      setStatusChecked(true);

      backgroundCheckTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        verifyConnection().then((online) => {
          if (mountedRef.current && !online) {
            wasOfflineRef.current = true;
            setIsOffline(true);
            setConnectionQuality("offline");
          }
        });
      }, 1000);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    checkIntervalRef.current = setInterval(() => {
      if (
        wasOfflineRef.current &&
        mountedRef.current &&
        !checkInProgressRef.current
      ) {
        checkConnection();
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (backgroundCheckTimeoutRef.current)
        clearTimeout(backgroundCheckTimeoutRef.current);
    };
  }, [
    handleOnline,
    handleOffline,
    handleVisibilityChange,
    checkConnection,
    verifyConnection,
  ]);

  return {
    isOffline,
    isCheckingConnection,
    connectionQuality,
    lastChecked,
    retryCount,
    statusChecked,
    connectionRestored,
    checkConnection,
  };
};
