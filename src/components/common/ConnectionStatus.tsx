import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, isCheckingConnection, connectionQuality, retryCount } = useOfflineDetection();

  if (isCheckingConnection) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm shadow-lg border border-yellow-200">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking connection...</span>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm shadow-lg border border-red-200">
        <WifiOff className="w-4 h-4" />
        <span>Offline {retryCount > 0 && `(Retry ${retryCount})`}</span>
      </div>
    );
  }

  if (connectionQuality === 'poor') {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-2 rounded-lg text-sm shadow-lg border border-orange-200">
        <Wifi className="w-4 h-4" />
        <span>Poor connection</span>
      </div>
    );
  }

  // Only show online status briefly when coming back online
  return null;
};