
import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  connectionSpeed: 'slow' | 'fast' | 'unknown';
}

export const usePerformance = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    connectionSpeed: 'unknown'
  });

  useEffect(() => {
    const measurePerformance = () => {
      // Measure page load time
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      
      // Measure render time
      const renderTime = performance.timing.domContentLoadedEventEnd - performance.timing.domLoading;
      
      // Get memory usage (if available)
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0; // MB
      
      // Estimate connection speed
      const connectionSpeed = getConnectionSpeed();
      
      setMetrics({
        loadTime,
        renderTime,
        memoryUsage,
        connectionSpeed
      });
    };

    const getConnectionSpeed = (): 'slow' | 'fast' | 'unknown' => {
      const connection = (navigator as any).connection;
      if (!connection) return 'unknown';
      
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return 'slow';
      }
      return 'fast';
    };

    // Measure immediately
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    // Monitor memory usage periodically
    const memoryMonitor = setInterval(() => {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memoryInfo.usedJSHeapSize / 1024 / 1024
        }));
      }
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('load', measurePerformance);
      clearInterval(memoryMonitor);
    };
  }, []);

  const isSlowDevice = () => {
    return metrics.memoryUsage > 100 || metrics.connectionSpeed === 'slow';
  };

  const getOptimizationSuggestions = () => {
    const suggestions = [];
    
    if (metrics.loadTime > 3000) {
      suggestions.push('Consider enabling offline mode for faster loading');
    }
    
    if (metrics.memoryUsage > 100) {
      suggestions.push('High memory usage detected - consider clearing cache');
    }
    
    if (metrics.connectionSpeed === 'slow') {
      suggestions.push('Slow connection detected - reduced quality mode enabled');
    }
    
    return suggestions;
  };

  return {
    metrics,
    isSlowDevice,
    getOptimizationSuggestions
  };
};
