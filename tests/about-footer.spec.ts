import { test, expect } from '@playwright/test';
const BASE = 'http://localhost:3000';
test('about 页 footer 钤印', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/about');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tests/about-footer.png' });
});
