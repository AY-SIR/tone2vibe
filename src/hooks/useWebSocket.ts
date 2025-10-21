import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: "connecting" | "connected" | "disconnected" | "error";
  lastMessage: WebSocketMessage | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  reconnectAttempts: number;
}

export const useWebSocket = (
  channelName: string,
  autoConnect = false
): UseWebSocketReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connect = async () => {
    if (!user) {
      console.warn("Cannot connect WebSocket: User not authenticated");
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    setConnectionState("connecting");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn("Cannot connect WebSocket: No access token");
        return;
      }

      const wsUrl = `wss://msbmyiqhohtjdfbjmxlf.supabase.co/realtime/v1?apikey=${session.access_token}&vsn=1.0.0`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionState("connected");
        setReconnectAttempts(0);

        // Subscribe to a Supabase Realtime channel
        const subscribeMessage = {
          type: "subscribe",
          topic: `realtime:${channelName}`,
          event: "phx_join",
          payload: {},
          ref: Date.now().toString(),
        };
        socketRef.current?.send(JSON.stringify(subscribeMessage));
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          console.log("WebSocket message received:", message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socketRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setConnectionState("disconnected");

        // Reconnect with exponential backoff
        if (reconnectAttempts < 5) {
          const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, delay);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionState("error");
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setConnectionState("error");
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setConnectionState("disconnected");
    setReconnectAttempts(0);
  };

  const sendMessage = (message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          ...message,
          timestamp: new Date().toISOString(),
        })
      );
      return true;
    }
    console.warn("WebSocket not connected, cannot send message");
    return false;
  };

  // Handle online/offline state changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      // Disconnect when going offline
      disconnect();
    } else if (autoConnect && user && !isConnected) {
      // Reconnect when coming back online
      connect();
    }
  }, [isOnline, autoConnect, user, isConnected]);

  useEffect(() => {
    if (autoConnect && user && isOnline) {
      connect();
    }
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, autoConnect, user, isOnline]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts,
  };
};
