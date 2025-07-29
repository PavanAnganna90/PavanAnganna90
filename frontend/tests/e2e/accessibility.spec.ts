import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

/**
 * Accessibility E2E Tests
 * Tests the application for WCAG compliance and accessibility best practices
 */

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  test('should have no accessibility violations on SSO page', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check for accessibility violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('should have no accessibility violations on dashboard', async ({ page }) => {
    // Authenticate first
    await authenticateUser(page);
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check for accessibility violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through all interactive elements
    const interactiveElements = await page.locator('button, a, input, select, textarea').count();
    
    for (let i = 0; i < interactiveElements; i++) {
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    if (headingCount > 0) {
      // Verify h1 exists and is the main heading
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
      
      // Check that headings have proper hierarchy
      for (let i = 0; i < headingCount; i++) {
        const heading = headings.nth(i);
        const text = await heading.textContent();
        expect(text?.trim()).toBeTruthy();
      }
    }
    
    // Check for landmarks
    const landmarks = page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
    const landmarkCount = await landmarks.count();
    expect(landmarkCount).toBeGreaterThan(0);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/auth/sso');
    await page.waitForLoadState('networkidle');
    
    // Check for color contrast violations
    const violations = await getViolations(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    const contrastViolations = violations.filter(violation => 
      violation.id === 'color-contrast'
    );
    
    expect(contrastViolations).toHaveLength(0);
  });

  test('should work with reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/auth/sso');
    await page.waitForLoadState('networkidle');
    
    // Check that animations respect reduced motion
    const animatedElements = page.locator('.animate-pulse, .animate-spin, .transition-all');
    const count = await animatedElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = animatedElements.nth(i);
      const computedStyle = await element.evaluate(el => 
        window.getComputedStyle(el).getPropertyValue('animation-duration')
      );
      
      // Animation should be disabled or significantly reduced
      expect(computedStyle === '0s' || computedStyle === '0.01s' || computedStyle === '').toBeTruthy();
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    
    await page.goto('/auth/sso');
    await page.waitForLoadState('networkidle');
    
    // Verify page is still usable
    await expect(page.locator('h1')).toBeVisible();
    
    // Check that interactive elements are still visible
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      await expect(button).toBeVisible();
    }
  });

  test('should have proper form labels and descriptions', async ({ page }) => {
    await page.goto('/simple-bypass');
    
    // Check for form inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      
      // Check for associated label
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        
        // Input should have either a label, aria-label, or aria-labelledby
        expect(hasLabel || ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    await authenticateUser(page);
    await page.goto('/dashboard');
    
    // Check for aria-live regions for dynamic content
    const liveRegions = page.locator('[aria-live]');
    const liveRegionCount = await liveRegions.count();
    
    // At least some dynamic content should be announced
    // This is implementation dependent but good to check
    if (liveRegionCount > 0) {
      for (let i = 0; i < liveRegionCount; i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      }
    }
  });

  test('should have descriptive button and link text', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Check buttons have descriptive text
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledby = await button.getAttribute('aria-labelledby');
      
      // Button should have descriptive text or aria-label
      const hasDescription = (text && text.trim().length > 0) || ariaLabel || ariaLabelledby;
      expect(hasDescription).toBeTruthy();
      
      // Avoid generic text like "click here" or "button"
      if (text) {
        const genericTerms = ['click here', 'button', 'link', 'read more'];
        const hasGenericText = genericTerms.some(term => 
          text.toLowerCase().includes(term.toLowerCase())
        );
        expect(hasGenericText).toBeFalsy();
      }
    }
  });

  test('should be navigable by voice commands', async ({ page }) => {
    await page.goto('/auth/sso');
    
    // Test that elements can be targeted by voice commands
    // by ensuring they have proper names/labels
    
    const clickableElements = page.locator('button, a, [role="button"], [role="link"]');
    const count = await clickableElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = clickableElements.nth(i);
      
      // Get accessible name
      const accessibleName = await element.evaluate(el => {
        // This approximates how screen readers determine the accessible name
        return el.getAttribute('aria-label') || 
               el.textContent?.trim() || 
               el.getAttribute('title') || 
               el.getAttribute('aria-labelledby');
      });
      
      expect(accessibleName).toBeTruthy();
      expect(accessibleName?.length).toBeGreaterThan(0);
    }
  });
});

/**
 * Helper function to authenticate user for protected page tests
 */
async function authenticateUser(page: any) {
  await page.goto('/auth/sso');
  
  // Use development bypass
  const devButton = page.locator('button:has-text("Development Mode")');
  if (await devButton.isVisible({ timeout: 5000 })) {
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
    
    // Wait for authentication to complete
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  }
}