import React from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, connectionQuality, statusChecked, isCheckingConnection } =
    useOfflineDetection();

  if (!statusChecked) return null;

  const getStatusClass = () => {
    if (isOffline || connectionQuality === 'offline') return 'offline';
    if (connectionQuality === 'poor') return 'poor';
    return 'good';
  };

  return (
    <div className="wifi-floating">
      <div
        className={`wifi-dot ${getStatusClass()} ${
          isCheckingConnection ? 'pulse' : ''
        }`}
        title={`Connection: ${getStatusClass()}`}
      />
    </div>
  );
};
