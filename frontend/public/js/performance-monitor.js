// Performance monitoring script - moved from inline to external file for security
// This script monitors Core Web Vitals and performance metrics

(function() {
  'use strict';
  
  // Only run if performance APIs are available
  if (!('PerformanceObserver' in window) || !('requestIdleCallback' in window)) {
    return;
  }

  // Performance monitoring (non-blocking)
  requestIdleCallback(() => {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Log performance metrics for debugging
          console.log('[Performance]', entry.name, entry.value);
          
          // Send to analytics service if available
          if (window.analytics && typeof window.analytics.track === 'function') {
            window.analytics.track('Performance Metric', {
              name: entry.name,
              value: entry.value,
              timestamp: new Date().toISOString()
            });
          }
        }
      });
      
      // Observe Core Web Vitals and navigation metrics
      observer.observe({ 
        entryTypes: ['measure', 'navigation', 'largest-contentful-paint', 'first-input'] 
      });
      
    } catch (error) {
      console.error('[Performance] Observer error:', error);
    }
  });

  // Report initial page load metrics
  window.addEventListener('load', () => {
    requestIdleCallback(() => {
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      if (navigationTiming) {
        console.log('[Performance] Page Load Time:', navigationTiming.loadEventEnd - navigationTiming.fetchStart, 'ms');
      }
    });
  });
})();