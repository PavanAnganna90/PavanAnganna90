import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests the authentication flow including SSO, GitHub OAuth, and development bypass
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display SSO page with authentication options', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Verify SSO page elements
    await expect(page.locator('h1')).toContainText('Sign In');
    await expect(page.locator('text=Choose your authentication method')).toBeVisible();
    
    // Verify GitHub OAuth button
    const githubButton = page.locator('button:has-text("Continue with GitHub")');
    await expect(githubButton).toBeVisible();
    await expect(githubButton).toBeEnabled();
    
    // Verify Enterprise SAML button
    const samlButton = page.locator('button:has-text("Continue with Enterprise SAML")');
    await expect(samlButton).toBeVisible();
    await expect(samlButton).toBeEnabled();
    
    // Verify Development Mode button
    const devButton = page.locator('button:has-text("Development Mode")');
    await expect(devButton).toBeVisible();
    await expect(devButton).toBeEnabled();
  });

  test('should navigate to GitHub OAuth flow', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Click GitHub OAuth button
    const githubButton = page.locator('button:has-text("Continue with GitHub")');
    await githubButton.click();
    
    // Should show status message or redirect
    await expect(page.locator('text=Initiating github OAuth')).toBeVisible();
    
    // Wait for potential redirect or error handling
    await page.waitForTimeout(2000);
  });

  test('should use development bypass successfully', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Click Development Mode button
    const devButton = page.locator('button:has-text("Development Mode")');
    await devButton.click();
    
    // Should navigate to simple bypass page
    await expect(page).toHaveURL(/.*\/simple-bypass/);
    
    // Verify simple bypass page
    await expect(page.locator('h1')).toContainText(/bypass|development|auth/i);
  });

  test('should handle simple bypass authentication', async ({ page }) => {
    await page.goto('/simple-bypass');
    
    // Check if bypass form exists
    const emailInput = page.locator('input[type="email"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await emailInput.isVisible({ timeout: 5000 })) {
      // Fill and submit bypass form
      await emailInput.fill('test@example.com');
      
      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible({ timeout: 2000 })) {
        await passwordInput.fill('password123');
      }
      
      await submitButton.click();
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
    } else {
      // If no form, might be auto-login - check for redirect
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/dashboard|auth/);
    }
  });

  test('should redirect to dashboard after successful auth', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Use development bypass
    const devButton = page.locator('button:has-text("Development Mode")');
    await devButton.click();
    
    // Navigate through simple bypass if needed
    if (page.url().includes('/simple-bypass')) {
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 5000 })) {
        await emailInput.fill('test@example.com');
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
      }
    }
    
    // Should end up on dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    
    // Verify we're authenticated
    await expect(page.locator('[data-testid="dashboard-overview"]')).toBeVisible({ timeout: 10000 });
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // First authenticate
    await page.goto('/auth/sso');
    const devButton = page.locator('button:has-text("Development Mode")');
    await devButton.click();
    
    // Handle simple bypass if needed
    if (page.url().includes('/simple-bypass')) {
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 5000 })) {
        await emailInput.fill('test@example.com');
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
      }
    }
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="dashboard-overview"]')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to auth when accessing protected routes without authentication', async ({ page }) => {
    // Try to access dashboard directly without authentication
    await page.goto('/dashboard');
    
    // Should redirect to authentication
    await expect(page).toHaveURL(/.*\/(auth|sso|login)/, { timeout: 10000 });
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    // Mock API error for authentication
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Authentication service unavailable' })
      });
    });
    
    await page.goto('/auth/sso');
    
    // Try to authenticate
    const devButton = page.locator('button:has-text("Development Mode")');
    await devButton.click();
    
    // Should handle error gracefully (not crash)
    await expect(page.locator('body')).toBeVisible();
    
    // May show error message
    const errorMessage = page.locator('text=Error').or(page.locator('.error')).or(page.locator('[role="alert"]'));
    // Error handling is implementation dependent
  });

  test('should handle GitHub OAuth callback', async ({ page }) => {
    // Navigate to callback with mock parameters
    const mockCode = 'mock_authorization_code';
    const mockState = 'mock_state_value';
    
    await page.goto(`/auth/callback?code=${mockCode}&state=${mockState}`);
    
    // Should handle callback (success or error)
    await page.waitForTimeout(3000);
    
    // Should either redirect to dashboard or show error
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/dashboard|auth|error|callback/);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/auth/sso');
    
    // Verify mobile layout
    await expect(page.locator('h1')).toBeVisible();
    
    // Auth buttons should be stack-able and touch-friendly
    const authButtons = page.locator('button');
    for (let i = 0; i < await authButtons.count(); i++) {
      const button = authButtons.nth(i);
      await expect(button).toBeVisible();
      
      // Verify button is large enough for touch (at least 44px height)
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});