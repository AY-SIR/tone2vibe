import React from 'react';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';

export const ConnectionStatus: React.FC = () => {
  // Run the hook to keep connection detection alive
  useOfflineDetection();

  // Render nothing to the user
  return null;
};
