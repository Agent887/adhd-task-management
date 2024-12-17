import { useCallback, useEffect, useState } from 'react';
import { useUserMetrics } from '../hooks/useUserMetrics';

interface PerformanceConfig {
  enableVirtualization: boolean;
  batchSize: number;
  debounceDelay: number;
  prefetchThreshold: number;
}

export const usePerformanceOptimizer = () => {
  const { metrics } = useUserMetrics();
  const [performanceMode, setPerformanceMode] = useState<'high' | 'balanced' | 'low'>('balanced');

  const getPerformanceConfig = (): PerformanceConfig => {
    switch (performanceMode) {
      case 'high':
        return {
          enableVirtualization: true,
          batchSize: 50,
          debounceDelay: 100,
          prefetchThreshold: 0.8,
        };
      case 'balanced':
        return {
          enableVirtualization: true,
          batchSize: 30,
          debounceDelay: 150,
          prefetchThreshold: 0.6,
        };
      case 'low':
        return {
          enableVirtualization: false,
          batchSize: 10,
          debounceDelay: 200,
          prefetchThreshold: 0.4,
        };
    }
  };

  // Automatically adjust performance mode based on metrics
  useEffect(() => {
    if (metrics.focusLevel < 30 || metrics.energyLevel < 30) {
      setPerformanceMode('low');
    } else if (metrics.focusLevel > 70 && metrics.energyLevel > 70) {
      setPerformanceMode('high');
    } else {
      setPerformanceMode('balanced');
    }
  }, [metrics]);

  const debounce = useCallback((fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }, []);

  const throttle = useCallback((fn: Function, limit: number) => {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }, []);

  const batchProcess = useCallback(<T>(
    items: T[],
    processor: (item: T) => void,
    config = getPerformanceConfig()
  ) => {
    const { batchSize } = config;
    let currentIndex = 0;

    const processBatch = () => {
      const batch = items.slice(currentIndex, currentIndex + batchSize);
      batch.forEach(processor);
      currentIndex += batchSize;

      if (currentIndex < items.length) {
        requestIdleCallback(() => processBatch());
      }
    };

    processBatch();
  }, []);

  const optimizeRender = useCallback((
    component: React.ComponentType<any>,
    props: any
  ) => {
    const config = getPerformanceConfig();

    // Apply performance optimizations based on config
    if (config.enableVirtualization) {
      // Wrap with virtualization HOC
      // This is a placeholder - actual implementation would depend on your virtualization library
      return {
        component,
        props: {
          ...props,
          virtualized: true,
          itemSize: 50,
          overscanCount: 5,
        },
      };
    }

    return { component, props };
  }, []);

  const measurePerformance = useCallback((
    operation: string,
    callback: () => void
  ) => {
    const start = performance.now();
    callback();
    const duration = performance.now() - start;

    // Log performance metrics
    console.debug(`Performance [${operation}]:`, duration.toFixed(2), 'ms');

    // Adjust performance mode if needed
    if (duration > 1000) {
      setPerformanceMode('low');
    }
  }, []);

  return {
    getPerformanceConfig,
    debounce,
    throttle,
    batchProcess,
    optimizeRender,
    measurePerformance,
    performanceMode,
  };
};
