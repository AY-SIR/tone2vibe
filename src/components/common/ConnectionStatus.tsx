
import React, { useEffect, useState } from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, connectionQuality, statusChecked, isCheckingConnection } =
    useOfflineDetection();

  const [pulseIndex, setPulseIndex] = useState(0);

  // Pulse animation while checking connection
  useEffect(() => {
    if (!isCheckingConnection) {
      setPulseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPulseIndex((prev) => (prev >= 4 ? 0 : prev + 1));
    }, 300);
    return () => clearInterval(interval);
  }, [isCheckingConnection]);

  if (!statusChecked) return null;

  const getStrength = () => {
    if (isOffline || connectionQuality === 'offline') return 0;
    if (connectionQuality === 'poor') return 2;
    return 4;
  };

  const strength = getStrength();

  return (
    <div className="wifi-floating">
      {[1, 2, 3, 4].map((i) => {
        const active = i <= strength;
        const pulse = isCheckingConnection && i === pulseIndex;
        return (
          <div
            key={i}
            className={`wifi-arc ${active ? connectionQuality : ''} ${
              pulse ? 'pulse' : ''
            }`}
          />
        );
      })}
      <div
        className={`wifi-dot ${
          isOffline
            ? 'offline'
            : connectionQuality === 'poor'
            ? 'poor'
            : 'good'
        } ${isCheckingConnection ? 'pulse' : ''}`}
      />
    </div>
  );
};
