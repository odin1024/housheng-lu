import { test, expect } from '@playwright/test';
const BASE = 'http://localhost:3000';
test('刷新页面后回到顶部', async ({ page }) => {
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(500);
  const beforeY = await page.evaluate(() => window.scrollY);
  expect(beforeY).toBeGreaterThan(1000);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const afterY = await page.evaluate(() => window.scrollY);
  expect(afterY).toBe(0);
  console.log(`refresh: before ${beforeY}, after ${afterY}`);
});

test('路由变化时回到顶部', async ({ page }) => {
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(1000);
  await page.click('a[href="/about"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBe(0);
  console.log(`route change: before ${before}, after ${after}`);
});
