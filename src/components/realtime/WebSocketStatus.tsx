
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, AlertCircle, Loader } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface WebSocketStatusProps {
  endpoint: string;
  autoConnect?: boolean;
  compact?: boolean;
}

export const WebSocketStatus = ({ endpoint, autoConnect = false, compact = false }: WebSocketStatusProps) => {
  const { isConnected, connectionState, connect, disconnect, reconnectAttempts } = useWebSocket(endpoint, autoConnect);

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <Badge variant="secondary" className={getStatusColor()}>
          {getStatusText()}
        </Badge>
        {!isConnected && (
          <Button size="sm" variant="outline" onClick={connect}>
            Connect
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>WebSocket Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection:</span>
          <Badge variant="secondary" className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Endpoint:</span>
          <span className="text-sm font-mono">{endpoint}</span>
        </div>

        {reconnectAttempts > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Reconnect attempts:</span>
            <span className="text-sm">{reconnectAttempts}/5</span>
          </div>
        )}

        <div className="flex space-x-2">
          {!isConnected ? (
            <Button size="sm" onClick={connect} disabled={connectionState === 'connecting'}>
              {connectionState === 'connecting' ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
