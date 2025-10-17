import React from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, connectionQuality } = useOfflineDetection();

  const getBars = () => {
    if (isOffline) return 0;
    if (connectionQuality === 'poor') return 2; // 2 bars
    return 4; // full bars for good
  };

  const bars = getBars();

  return (
    <div className="wifi-signal">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`bar ${i <= bars ? 'active' : ''} ${
            isOffline ? 'offline' : connectionQuality === 'poor' ? 'poor' : 'good'
          }`}
        />
      ))}
    </div>
  );
};
