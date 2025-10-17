import React, { useEffect, useState } from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, connectionQuality } = useOfflineDetection();
  const [statusClass, setStatusClass] = useState('');

  useEffect(() => {
    if (isOffline) setStatusClass('offline');
    else if (connectionQuality === 'poor') setStatusClass('poor');
    else setStatusClass('online');

    setTimeout(() => setStatusClass(''), 3000); // auto hide animation
  }, [isOffline, connectionQuality]);

  return <div className={`connection-anim ${statusClass}`} />;
};
