
import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    const title = await page.title();
    console.log("✅ Frontend is working\!");
    console.log("Title:", title);
    
    // Take screenshot
    await page.screenshot({ path: "frontend_screenshot.png" });
    console.log("📸 Screenshot saved as frontend_screenshot.png");
    
    // Get page content
    const content = await page.content();
    console.log("📄 Page loaded successfully, content length:", content.length);
    
  } catch (error) {
    console.log("❌ Frontend not accessible:", error.message);
  } finally {
    await browser.close();
  }
})();

