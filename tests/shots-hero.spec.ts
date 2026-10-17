// 首屏出图 (桌面 + 移动)
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('首屏出图', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tests/screenshots/out-hero-desktop.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tests/screenshots/out-hero-mobile.png' });
});
