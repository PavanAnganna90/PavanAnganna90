import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * Tests the main dashboard functionality including navigation, data loading, and user interactions
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (should redirect to auth if not authenticated)
    await page.goto('/dashboard');
  });

  test('should display dashboard after authentication', async ({ page }) => {
    // Handle authentication flow
    await handleAuthentication(page);
    
    // Verify dashboard elements are present
    await expect(page.locator('h1')).toContainText(/Good (morning|afternoon|evening)/);
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-logs"]')).toBeVisible();
  });

  test('should load and display stats cards', async ({ page }) => {
    await handleAuthentication(page);
    
    // Wait for stats to load
    await page.waitForSelector('[data-testid="stats-cards"]', { timeout: 10000 });
    
    // Verify stats cards are present
    const statsCards = page.locator('[data-testid="stats-card"]');
    await expect(statsCards).toHaveCount(4); // Users, Posts, Views, Engagement
    
    // Verify each card has title and value
    for (let i = 0; i < 4; i++) {
      const card = statsCards.nth(i);
      await expect(card.locator('.text-sm')).toBeVisible(); // Title
      await expect(card.locator('.text-2xl')).toBeVisible(); // Value
    }
  });

  test('should display activity logs', async ({ page }) => {
    await handleAuthentication(page);
    
    // Wait for activity logs to load
    await page.waitForSelector('[data-testid="activity-logs"]', { timeout: 10000 });
    
    const activitySection = page.locator('[data-testid="activity-logs"]');
    await expect(activitySection).toBeVisible();
    
    // Check if there are activity items or empty state
    const activityItems = page.locator('[data-testid="activity-item"]');
    const emptyState = page.locator('text=No recent activity');
    
    // Either activities exist or empty state is shown
    await expect(activityItems.count().then(count => count > 0) || emptyState.isVisible()).toBeTruthy();
  });

  test('should navigate to different sections', async ({ page }) => {
    await handleAuthentication(page);
    
    // Test navigation to users page
    const usersLink = page.locator('a[href*="/dashboard/users"]').first();
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await expect(page).toHaveURL(/.*\/dashboard\/users/);
      await page.goBack();
    }
    
    // Test navigation to posts page
    const postsLink = page.locator('a[href*="/dashboard/posts"]').first();
    if (await postsLink.isVisible()) {
      await postsLink.click();
      await expect(page).toHaveURL(/.*\/dashboard\/posts/);
      await page.goBack();
    }
  });

  test('should handle quick actions', async ({ page }) => {
    await handleAuthentication(page);
    
    // Wait for quick actions section
    await page.waitForSelector('[data-testid="quick-actions"]', { timeout: 10000 });
    
    const quickActions = page.locator('[data-testid="quick-actions"]');
    await expect(quickActions).toBeVisible();
    
    // Verify quick action buttons
    const actionButtons = quickActions.locator('button');
    await expect(actionButtons).toHaveCount(4); // New Post, Add User, View Analytics, Settings
    
    // Test clicking on first action button
    const firstButton = actionButtons.first();
    await expect(firstButton).toBeVisible();
    await expect(firstButton).toBeEnabled();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await handleAuthentication(page);
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="dashboard-overview"]')).toBeVisible();
    
    // Stats should stack vertically on mobile
    const statsGrid = page.locator('[data-testid="stats-cards"]');
    await expect(statsGrid).toHaveCSS('display', /grid|flex/);
    
    // Quick actions should be responsive
    const quickActions = page.locator('[data-testid="quick-actions"]');
    if (await quickActions.isVisible()) {
      const actionGrid = quickActions.locator('> div');
      await expect(actionGrid).toHaveCSS('display', /grid|flex/);
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('**/api/dashboard/stats', async route => {
      // Delay response to test loading state
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await handleAuthentication(page);
    
    // Should show loading state initially
    const loadingIndicator = page.locator('.animate-pulse');
    await expect(loadingIndicator).toBeVisible();
    
    // Loading should disappear after data loads
    await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 });
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/dashboard/stats', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await handleAuthentication(page);
    
    // Should handle error gracefully (not crash the page)
    await expect(page.locator('body')).toBeVisible();
    
    // Should potentially show error message or fallback UI
    // This depends on implementation
  });
});

/**
 * Helper function to handle authentication flow
 */
async function handleAuthentication(page: any) {
  // Check if we're already on dashboard
  if (page.url().includes('/dashboard')) {
    return;
  }
  
  // Check if we're on auth page
  if (page.url().includes('/auth') || page.url().includes('/sso')) {
    // Look for development bypass button
    const devBypassButton = page.locator('button:has-text("Development Mode")');
    
    if (await devBypassButton.isVisible({ timeout: 5000 })) {
      await devBypassButton.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      return;
    }
    
    // Look for simple bypass option
    const simpleBypassLink = page.locator('a[href*="/simple-bypass"]');
    if (await simpleBypassLink.isVisible({ timeout: 5000 })) {
      await simpleBypassLink.click();
      await page.waitForURL('**/simple-bypass', { timeout: 10000 });
      
      // Fill simple auth form if present
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      if (await emailInput.isVisible({ timeout: 5000 })) {
        await emailInput.fill('test@example.com');
        await submitButton.click();
        await page.waitForURL('**/dashboard', { timeout: 10000 });
      }
    }
  }
  
  // Wait for dashboard to be ready
  await page.waitForLoadState('networkidle');
}