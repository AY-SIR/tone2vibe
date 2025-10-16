import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, isCheckingConnection, connectionQuality, retryCount } = useOfflineDetection();

  if (isCheckingConnection) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking connection...</span>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm">
        <WifiOff className="w-4 h-4" />
        <span>Offline {retryCount > 0 && `(Retry ${retryCount})`}</span>
      </div>
    );
  }

  if (connectionQuality === 'poor') {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-2 rounded-lg text-sm">
        <Wifi className="w-4 h-4" />
        <span>Poor connection</span>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm">
      <Wifi className="w-4 h-4" />
      <span>Online</span>
    </div>
  );
};