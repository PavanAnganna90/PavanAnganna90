import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs before all tests to prepare the test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...');
  
  // Start a browser instance for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the dev server to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    console.log(`⏳ Waiting for server at ${baseURL}...`);
    
    // Check if the server is responding
    let retries = 0;
    const maxRetries = 30; // 30 seconds
    
    while (retries < maxRetries) {
      try {
        const response = await page.goto(baseURL, { 
          waitUntil: 'networkidle',
          timeout: 5000 
        });
        
        if (response && response.status() < 400) {
          console.log('✅ Server is ready!');
          break;
        }
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw new Error(`Server at ${baseURL} is not responding after ${maxRetries} seconds`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Setup authentication state if needed
    await setupAuthenticationState(page, baseURL);
    
    // Setup test data if needed
    await setupTestData(page);
    
    console.log('✅ Playwright global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Playwright global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Setup authentication state for tests
 */
async function setupAuthenticationState(page: any, baseURL: string) {
  console.log('🔐 Setting up authentication state...');
  
  try {
    // Navigate to SSO page to check if dev bypass is available
    await page.goto(`${baseURL}/auth/sso`);
    
    // Check if development bypass button exists
    const devBypassButton = page.locator('button:has-text("Development Mode")');
    
    if (await devBypassButton.isVisible({ timeout: 5000 })) {
      console.log('🔓 Using development authentication bypass');
      await devBypassButton.click();
      
      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Save authenticated state
      await page.context().storageState({ 
        path: './tests/setup/auth-state.json' 
      });
      
      console.log('✅ Authentication state saved');
    } else {
      console.log('ℹ️  No development bypass available, tests will handle auth individually');
    }
  } catch (error) {
    console.log('⚠️  Authentication setup skipped:', error.message);
  }
}

/**
 * Setup test data
 */
async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');
  
  try {
    // Clear any existing test data
    await page.evaluate(() => {
      // Clear localStorage
      localStorage.clear();
      // Clear sessionStorage
      sessionStorage.clear();
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    });
    
    console.log('✅ Test environment cleaned');
  } catch (error) {
    console.log('⚠️  Test data setup skipped:', error.message);
  }
}

export default globalSetup;