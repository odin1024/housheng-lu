// 截首页 6 阶段
import { test } from '@playwright/test';
const BASE = 'http://127.0.0.1:3000';
test('home with 6 stages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  // 滚到人生阶段
  await page.evaluate(() => {
    const headings = document.querySelectorAll('h2');
    for (const h of headings) {
      if (h.textContent?.includes('人生阶段')) {
        h.scrollIntoView({ block: 'start' });
        break;
      }
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/life-stages-6.png' });
  const stages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="stage="]')).map(a => a.textContent?.trim().slice(0, 20));
  });
  console.log('stages:', stages);
});
