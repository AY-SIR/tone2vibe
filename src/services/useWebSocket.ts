import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext'; // your AuthProvider

type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: ConnectionState;
  connect: () => void;
  disconnect: () => void;
  reconnectAttempts: number;
}

export const useWebSocket = (url: string, autoConnect = false): UseWebSocketReturn => {
  const { session } = useAuth(); // get current Supabase session
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const maxRetries = 5;

  const connect = useCallback(() => {
    if (!session) {
      console.warn('Cannot connect: session not ready');
      return;
    }

    if (wsRef.current || reconnectAttempts >= maxRetries) return;

    setConnectionState('connecting');

    // Add auth token to URL if needed
    const token = session.access_token;
    const wsUrl = url.includes('apikey') ? url : `${url}&apikey=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setConnectionState('disconnected');

      if (reconnectAttempts < maxRetries) {
        const delay = 1000 * Math.pow(2, reconnectAttempts); // exponential backoff
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setIsConnected(false);
      setConnectionState('error');
      ws.close();
    };
  }, [session, url, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  // Auto connect after session is ready
  useEffect(() => {
    if (autoConnect && session) {
      connect();
    }

    return () => disconnect(); // cleanup on unmount
  }, [autoConnect, session, connect, disconnect]);

  return { isConnected, connectionState, connect, disconnect, reconnectAttempts };
};
