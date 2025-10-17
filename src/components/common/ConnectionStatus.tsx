import React from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, connectionQuality, statusChecked } = useOfflineDetection();

  // Show nothing until first check completes
  if (!statusChecked) return null;

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
