import React from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, connectionQuality } = useOfflineDetection();

  const getBars = () => {
    if (isOffline || connectionQuality === 'offline') return 0;
    if (connectionQuality === 'poor') return 2;
    return 4;
  };

  const bars = getBars();

  return (
    <div className="wifi-floating">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`wifi-bar ${i <= bars ? 'active' : ''} ${
            isOffline
              ? 'offline'
              : connectionQuality === 'poor'
              ? 'poor'
              : 'good'
          }`}
        />
      ))}
    </div>
  );
};
