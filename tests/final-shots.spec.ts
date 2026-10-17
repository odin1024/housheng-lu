// 最终全页截图
import { test } from '@playwright/test';
const BASE = 'http://localhost:3000';
test('book 10-23 final', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(BASE + '/book/10-23');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/final-10-23-mobile.png', fullPage: true });
});
test('book 1-1 final', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(BASE + '/book/1-1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/final-1-1-mobile.png', fullPage: true });
});
test('home final', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/final-home-desktop.png', fullPage: false });
});
test('explore sticky final', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tests/screenshots/final-explore-sticky.png', fullPage: false });
});
