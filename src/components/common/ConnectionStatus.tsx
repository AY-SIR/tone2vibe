import React, { useEffect, useState, useRef } from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  const { isOffline, connectionQuality } = useOfflineDetection();
  const [statusClass, setStatusClass] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Determine class based on status
    const newClass = isOffline ? 'offline' : connectionQuality === 'poor' ? 'poor' : 'online';
    setStatusClass(newClass);

    // Clear previous timeout if it exists
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Auto-hide after 3s
    timeoutRef.current = setTimeout(() => {
      setStatusClass('');
    }, 3000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOffline, connectionQuality]);

  return <div className={`connection-anim ${statusClass}`} />;
};
