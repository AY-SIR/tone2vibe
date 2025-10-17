import React from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, connectionQuality } = useOfflineDetection();

  // Determine number of bars
  const getBars = () => {
    if (isOffline || connectionQuality === 'offline') return 0;
    if (connectionQuality === 'poor') return 2;
    return 4; // good
  };

  const bars = getBars();

  return (
    <div className="wifi-signal">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`bar ${i <= bars ? 'active' : ''} ${
            connectionQuality === 'offline'
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
