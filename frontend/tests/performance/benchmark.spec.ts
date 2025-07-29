import { test, expect } from '@playwright/test';

/**
 * Performance Benchmark Tests
 * Measures and validates application performance metrics
 */

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
  bundleSize: number;
}

test.describe('Performance Benchmarks', () => {
  test('should meet performance benchmarks for dashboard page', async ({ page }) => {
    const metrics = await measurePagePerformance(page, '/dashboard');
    
    // Define performance thresholds
    const thresholds = {
      loadTime: 3000, // 3 seconds
      renderTime: 1500, // 1.5 seconds
      interactionTime: 100, // 100ms
      bundleSize: 500 * 1024, // 500KB
    };
    
    // Validate metrics against thresholds
    expect(metrics.loadTime).toBeLessThan(thresholds.loadTime);
    expect(metrics.renderTime).toBeLessThan(thresholds.renderTime);
    expect(metrics.interactionTime).toBeLessThan(thresholds.interactionTime);
    expect(metrics.bundleSize).toBeLessThan(thresholds.bundleSize);
    
    // Log metrics for tracking
    console.log('Dashboard Performance Metrics:', metrics);
  });

  test('should meet performance benchmarks for SSO page', async ({ page }) => {
    const metrics = await measurePagePerformance(page, '/auth/sso');
    
    // SSO page should be faster (lighter content)
    const thresholds = {
      loadTime: 2000, // 2 seconds
      renderTime: 1000, // 1 second
      interactionTime: 80, // 80ms
      bundleSize: 300 * 1024, // 300KB
    };
    
    expect(metrics.loadTime).toBeLessThan(thresholds.loadTime);
    expect(metrics.renderTime).toBeLessThan(thresholds.renderTime);
    expect(metrics.interactionTime).toBeLessThan(thresholds.interactionTime);
    
    console.log('SSO Performance Metrics:', metrics);
  });

  test('should handle concurrent users efficiently', async ({ browser }) => {
    // Simulate multiple concurrent users
    const userCount = 5;
    const contexts = [];
    const pages = [];
    
    // Create multiple browser contexts
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }
    
    // Measure performance with concurrent load
    const startTime = Date.now();
    
    const promises = pages.map(async (page, index) => {
      return measurePagePerformance(page, '/auth/sso');
    });
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // Calculate averages
    const avgLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
    const avgRenderTime = results.reduce((sum, r) => sum + r.renderTime, 0) / results.length;
    
    // Performance shouldn't degrade significantly under concurrent load
    expect(avgLoadTime).toBeLessThan(4000); // 4 seconds under load
    expect(avgRenderTime).toBeLessThan(2000); // 2 seconds under load
    expect(totalTime).toBeLessThan(10000); // All users served within 10 seconds
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
    
    console.log('Concurrent Load Results:', {
      userCount,
      avgLoadTime,
      avgRenderTime,
      totalTime,
    });
  });

  test('should maintain performance on slower networks', async ({ page }) => {
    // Simulate slow 3G network
    await page.context().route('**/*', async route => {
      // Add artificial delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 50));
      await route.continue();
    });
    
    const metrics = await measurePagePerformance(page, '/auth/sso');
    
    // Adjusted thresholds for slow network
    const slowNetworkThresholds = {
      loadTime: 8000, // 8 seconds on slow network
      renderTime: 4000, // 4 seconds
      interactionTime: 200, // 200ms
    };
    
    expect(metrics.loadTime).toBeLessThan(slowNetworkThresholds.loadTime);
    expect(metrics.renderTime).toBeLessThan(slowNetworkThresholds.renderTime);
    expect(metrics.interactionTime).toBeLessThan(slowNetworkThresholds.interactionTime);
    
    console.log('Slow Network Performance:', metrics);
  });

  test('should handle large data sets efficiently', async ({ page }) => {
    await authenticateUser(page);
    
    // Mock large dataset response
    await page.route('**/api/dashboard/stats', async route => {
      const largeResponse = {
        success: true,
        data: {
          users: { total: 10000, active: 7500, growth: 15.5 },
          posts: { total: 50000, published: 45000, drafts: 5000, thisMonth: 2500 },
          engagement: {
            totalViews: 1000000,
            totalComments: 25000,
            avgViewsPerPost: 200,
            topPosts: Array(100).fill(null).map((_, i) => ({
              id: `post-${i}`,
              title: `Top Post ${i + 1}`,
              viewCount: 1000 - i * 10,
              commentCount: 50 - i,
              status: 'PUBLISHED'
            }))
          }
        }
      };
      
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(largeResponse)
      });
    });
    
    const metrics = await measurePagePerformance(page, '/dashboard');
    
    // Should handle large datasets without significant performance impact
    expect(metrics.loadTime).toBeLessThan(5000); // 5 seconds with large data
    expect(metrics.renderTime).toBeLessThan(3000); // 3 seconds to render
    
    console.log('Large Dataset Performance:', metrics);
  });

  test('should optimize bundle loading strategy', async ({ page }) => {
    const bundleMetrics = await analyzeBundleLoading(page, '/dashboard');
    
    // Validate bundle loading efficiency
    expect(bundleMetrics.initialBundleSize).toBeLessThan(250 * 1024); // 250KB initial
    expect(bundleMetrics.totalBundleSize).toBeLessThan(1 * 1024 * 1024); // 1MB total
    expect(bundleMetrics.chunkCount).toBeLessThan(10); // Less than 10 chunks
    expect(bundleMetrics.loadingTime).toBeLessThan(2000); // 2 seconds to load all
    
    console.log('Bundle Loading Metrics:', bundleMetrics);
  });

  test('should maintain 60fps during interactions', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/dashboard');
    
    // Measure frame rate during scrolling
    const frameMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        let startTime = performance.now();
        
        const measureFrames = () => {
          frameCount++;
          
          if (frameCount < 60) {
            requestAnimationFrame(measureFrames);
          } else {
            const endTime = performance.now();
            const duration = endTime - startTime;
            const fps = (frameCount / duration) * 1000;
            resolve(fps);
          }
        };
        
        // Start scrolling to trigger animations
        window.scrollBy(0, 10);
        requestAnimationFrame(measureFrames);
      });
    });
    
    // Should maintain close to 60fps
    expect(frameMetrics).toBeGreaterThan(55); // At least 55fps
    
    console.log('Frame Rate During Interactions:', frameMetrics);
  });

  test('should efficiently handle form submissions', async ({ page }) => {
    await page.goto('/simple-bypass');
    
    const startTime = Date.now();
    
    // Fill and submit form
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill('test@example.com');
      
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Wait for form processing
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }
    
    const submissionTime = Date.now() - startTime;
    
    // Form submission should be quick
    expect(submissionTime).toBeLessThan(3000); // 3 seconds max
    
    console.log('Form Submission Time:', submissionTime);
  });
});

/**
 * Measure comprehensive page performance metrics
 */
async function measurePagePerformance(page: any, url: string): Promise<PerformanceMetrics> {
  const startTime = Date.now();
  
  // Navigate to page
  await page.goto(url);
  const loadTime = Date.now() - startTime;
  
  // Wait for page to be fully rendered
  await page.waitForLoadState('networkidle');
  const renderTime = Date.now() - startTime;
  
  // Measure interaction responsiveness
  const interactionStartTime = Date.now();
  const firstButton = page.locator('button').first();
  if (await firstButton.isVisible({ timeout: 2000 })) {
    await firstButton.hover();
  }
  const interactionTime = Date.now() - interactionStartTime;
  
  // Measure bundle size
  const bundleSize = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    return scripts.reduce((total, script) => {
      const src = (script as HTMLScriptElement).src;
      if (src.includes('/_next/static/')) {
        // Estimate based on typical Next.js bundle sizes
        return total + 100 * 1024; // 100KB estimate per chunk
      }
      return total;
    }, 0);
  });
  
  // Get memory usage if available
  const memoryUsage = await page.evaluate(() => {
    // @ts-ignore
    return (performance as any).memory?.usedJSHeapSize || 0;
  });
  
  return {
    loadTime,
    renderTime,
    interactionTime,
    bundleSize,
    memoryUsage,
  };
}

/**
 * Analyze bundle loading metrics
 */
async function analyzeBundleLoading(page: any, url: string) {
  const requests: any[] = [];
  
  page.on('response', response => {
    if (response.url().includes('/_next/static/')) {
      requests.push({
        url: response.url(),
        size: response.headers()['content-length'] || 0,
        status: response.status(),
        timing: response.timing(),
      });
    }
  });
  
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  const loadingTime = Date.now() - startTime;
  
  const totalBundleSize = requests.reduce((total, req) => total + parseInt(req.size || '0'), 0);
  const initialBundle = requests.filter(req => req.url.includes('/pages/') || req.url.includes('/chunks/'));
  const initialBundleSize = initialBundle.reduce((total, req) => total + parseInt(req.size || '0'), 0);
  
  return {
    chunkCount: requests.length,
    totalBundleSize,
    initialBundleSize,
    loadingTime,
    requests,
  };
}

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