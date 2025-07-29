import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

/**
 * Lighthouse Performance Tests
 * Tests web performance metrics using Lighthouse
 */

test.describe('Performance - Lighthouse Audits', () => {
  test('should meet performance benchmarks on dashboard', async ({ page }) => {
    // Authenticate first
    await authenticateUser(page);
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Run Lighthouse audit
    await playAudit({
      page,
      thresholds: {
        performance: 85,
        accessibility: 90,
        'best-practices': 85,
        seo: 80,
        pwa: 70,
      },
      port: 9222,
    });
  });

  test('should have good Core Web Vitals on SSO page', async ({ page }) => {
    await page.goto('/auth/sso');
    await page.waitForLoadState('networkidle');
    
    // Run Lighthouse audit with focus on Core Web Vitals
    await playAudit({
      page,
      thresholds: {
        performance: 80,
        accessibility: 95,
      },
      port: 9222,
      reports: {
        formats: {
          json: true,
          html: true,
        },
        name: 'sso-page-audit',
        directory: './lighthouse-reports',
      },
    });
  });

  test('should perform well on mobile devices', async ({ page }) => {
    // Set mobile viewport and user agent
    await page.setViewportSize({ width: 375, height: 667 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');
    
    await authenticateUser(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Run mobile-focused Lighthouse audit
    await playAudit({
      page,
      thresholds: {
        performance: 75, // Lower threshold for mobile
        accessibility: 90,
        'best-practices': 85,
      },
      port: 9222,
      opts: {
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    });
  });

  test('should have minimal JavaScript bundle size impact', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Measure bundle sizes
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation').map(entry => ({
        transferSize: (entry as PerformanceNavigationTiming).transferSize,
        encodedBodySize: (entry as PerformanceNavigationTiming).encodedBodySize,
        decodedBodySize: (entry as PerformanceNavigationTiming).decodedBodySize,
      }));
    });
    
    if (performanceEntries.length > 0) {
      const entry = performanceEntries[0];
      
      // Check that main document size is reasonable
      expect(entry.transferSize).toBeLessThan(500 * 1024); // Less than 500KB
      expect(entry.encodedBodySize).toBeLessThan(300 * 1024); // Less than 300KB
    }
  });
});

/**
 * Custom Performance Metrics Tests
 */
test.describe('Performance - Custom Metrics', () => {
  test('should have fast page load times', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/auth/sso');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have fast Time to Interactive (TTI)', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Measure TTI by checking when page becomes interactive
    const tti = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now();
        
        // Wait for page to be fully interactive
        const checkInteractive = () => {
          const now = performance.now();
          
          // Check if main thread is idle
          if (document.readyState === 'complete') {
            resolve(now - startTime);
          } else {
            setTimeout(checkInteractive, 100);
          }
        };
        
        checkInteractive();
      });
    });
    
    // TTI should be under 4 seconds
    expect(tti).toBeLessThan(4000);
  });

  test('should have minimal Cumulative Layout Shift (CLS)', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Monitor layout shifts
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
        
        // Measure for 3 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });
    
    // CLS should be less than 0.1 (good)
    expect(cls).toBeLessThan(0.1);
  });

  test('should have fast Largest Contentful Paint (LCP)', async ({ page }) => {
    await page.goto('/dashboard');
    
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        });
        
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Fallback timeout
        setTimeout(() => resolve(null), 5000);
      });
    });
    
    if (lcp) {
      // LCP should be under 2.5 seconds (good)
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('should have responsive First Input Delay (FID)', async ({ page }) => {
    await page.goto('/auth/sso');
    await page.waitForLoadState('networkidle');
    
    // Simulate user interaction and measure FID
    const startTime = Date.now();
    
    const button = page.locator('button').first();
    await button.click();
    
    const responseTime = Date.now() - startTime;
    
    // FID should be under 100ms (good)
    expect(responseTime).toBeLessThan(100);
  });

  test('should efficiently handle memory usage', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/dashboard');
    
    // Get memory usage information
    const memoryInfo = await page.evaluate(() => {
      // @ts-ignore - performance.memory is Chrome-specific
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : null;
    });
    
    if (memoryInfo) {
      // Used heap should be reasonable (less than 50MB)
      const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
      expect(usedMB).toBeLessThan(50);
      
      // Memory usage efficiency
      const efficiency = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
      expect(efficiency).toBeLessThan(0.8); // Less than 80% of allocated heap
    }
  });

  test('should have efficient resource loading', async ({ page }) => {
    // Monitor network requests
    const requests: any[] = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        resourceType: request.resourceType(),
        method: request.method(),
      });
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Analyze requests
    const jsRequests = requests.filter(r => r.resourceType === 'script');
    const cssRequests = requests.filter(r => r.resourceType === 'stylesheet');
    const imageRequests = requests.filter(r => r.resourceType === 'image');
    
    // Should have reasonable number of requests
    expect(jsRequests.length).toBeLessThan(10); // Less than 10 JS files
    expect(cssRequests.length).toBeLessThan(5); // Less than 5 CSS files
    expect(imageRequests.length).toBeLessThan(20); // Less than 20 images
    
    // Should not have excessive requests
    expect(requests.length).toBeLessThan(50);
  });
});

/**
 * Helper function to authenticate user
 */
async function authenticateUser(page: any) {
  await page.goto('/auth/sso');
  
  const devButton = page.locator('button:has-text("Development Mode")');
  if (await devButton.isVisible({ timeout: 5000 })) {
    await devButton.click();
    
    if (page.url().includes('/simple-bypass')) {
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 5000 })) {
        await emailInput.fill('test@example.com');
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
      }
    }
    
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  }
}