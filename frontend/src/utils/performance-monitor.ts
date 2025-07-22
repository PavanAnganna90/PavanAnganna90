/**
 * Performance monitoring utilities for OpsSight frontend
 */

import React from 'react';

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

export interface ResourceTiming {
  name: string;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observer: PerformanceObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initializeObserver();
    }
  }

  private initializeObserver() {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime;
            }
            break;
          case 'largest-contentful-paint':
            this.metrics.largestContentfulPaint = entry.startTime;
            break;
          case 'first-input':
            this.metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              this.metrics.cumulativeLayoutShift = 
                (this.metrics.cumulativeLayoutShift || 0) + (entry as any).value;
            }
            break;
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.pageLoadTime = navEntry.loadEventEnd - navEntry.fetchStart;
            this.metrics.timeToInteractive = navEntry.domInteractive - navEntry.fetchStart;
            break;
        }
      }
    });

    try {
      this.observer.observe({ type: 'paint', buffered: true });
      this.observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observer.observe({ type: 'first-input', buffered: true });
      this.observer.observe({ type: 'layout-shift', buffered: true });
      this.observer.observe({ type: 'navigation', buffered: true });
    } catch (error) {
      console.warn('Performance observer not fully supported:', error);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get resource timing information
   */
  getResourceTiming(): ResourceTiming[] {
    if (typeof window === 'undefined') return [];
    
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.map(resource => ({
      name: resource.name,
      duration: resource.duration,
      transferSize: resource.transferSize || 0,
      encodedBodySize: resource.encodedBodySize || 0,
      decodedBodySize: resource.decodedBodySize || 0,
    }));
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): Partial<PerformanceMetrics> {
    return {
      firstContentfulPaint: this.metrics.firstContentfulPaint,
      largestContentfulPaint: this.metrics.largestContentfulPaint,
      firstInputDelay: this.metrics.firstInputDelay,
      cumulativeLayoutShift: this.metrics.cumulativeLayoutShift,
    };
  }

  /**
   * Send performance metrics to analytics
   */
  sendToAnalytics(endpoint: string) {
    const metrics = this.getMetrics();
    const resources = this.getResourceTiming();
    
    // Send data to analytics endpoint
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify({
        metrics,
        resources,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }));
    }
  }

  /**
   * Mark custom performance timing
   */
  mark(name: string) {
    if (typeof window !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * Measure custom performance timing
   */
  measure(name: string, startMark: string, endMark?: string) {
    if (typeof window !== 'undefined' && performance.measure) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark);
        } else {
          performance.measure(name, startMark);
        }
      } catch (error) {
        console.warn('Performance measure failed:', error);
      }
    }
  }

  /**
   * Get custom measurements
   */
  getMeasurements(): PerformanceMeasure[] {
    if (typeof window === 'undefined') return [];
    return performance.getEntriesByType('measure') as PerformanceMeasure[];
  }

  /**
   * Monitor component render performance
   */
  monitorComponentRender(componentName: string, renderFn: () => void) {
    const startMark = `${componentName}-render-start`;
    const endMark = `${componentName}-render-end`;
    
    this.mark(startMark);
    renderFn();
    this.mark(endMark);
    this.measure(`${componentName}-render-time`, startMark, endMark);
  }

  /**
   * Monitor async operation performance
   */
  async monitorAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startMark = `${operationName}-start`;
    const endMark = `${operationName}-end`;
    
    this.mark(startMark);
    try {
      const result = await operation();
      this.mark(endMark);
      this.measure(`${operationName}-duration`, startMark, endMark);
      return result;
    } catch (error) {
      this.mark(endMark);
      this.measure(`${operationName}-error`, startMark, endMark);
      throw error;
    }
  }

  /**
   * Get performance budget violations
   */
  getBudgetViolations(): string[] {
    const violations: string[] = [];
    const metrics = this.getMetrics();

    // Performance budget thresholds
    const budgets = {
      firstContentfulPaint: 2000, // 2 seconds
      largestContentfulPaint: 4000, // 4 seconds
      firstInputDelay: 100, // 100ms
      cumulativeLayoutShift: 0.1, // 0.1 score
      pageLoadTime: 3000, // 3 seconds
    };

    Object.entries(budgets).forEach(([metric, threshold]) => {
      const value = metrics[metric as keyof PerformanceMetrics];
      if (value && value > threshold) {
        violations.push(`${metric}: ${value.toFixed(2)} exceeds budget of ${threshold}`);
      }
    });

    return violations;
  }

  /**
   * Dispose of the performance monitor
   */
  dispose() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    monitor: performanceMonitor,
    metrics: performanceMonitor.getMetrics(),
    coreWebVitals: performanceMonitor.getCoreWebVitals(),
    budgetViolations: performanceMonitor.getBudgetViolations(),
  };
}

// HOC for monitoring component performance
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    React.useEffect(() => {
      performanceMonitor.mark(`${componentName}-mount`);
      return () => {
        performanceMonitor.mark(`${componentName}-unmount`);
        performanceMonitor.measure(
          `${componentName}-lifecycle`,
          `${componentName}-mount`,
          `${componentName}-unmount`
        );
      };
    }, []);

    return React.createElement(Component, props);
  };
}

// Export performance monitoring utilities
export {
  PerformanceMonitor,
  performanceMonitor,
};