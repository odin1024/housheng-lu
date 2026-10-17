// 截图保存海报, 人工目测
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test('截图: 1 条方形海报', async ({ page }) => {
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("急救 心脏骤停")').click();
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("生成预览")').click();
  await page.waitForTimeout(2500);
  const preview = page.locator('img[alt*="海报预览"]');
  await expect(preview).toBeVisible();
  await preview.screenshot({ path: 'tests/poster-1item-square.png' });
  console.log('✓ saved tests/poster-1item-square.png');
});

test('截图: 3 条方形海报', async ({ page }) => {
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("安全+急救+法律")').click();
  await page.waitForTimeout(2000);
  const preview = page.locator('img[alt*="海报预览"]');
  await expect(preview).toBeVisible();
  await preview.screenshot({ path: 'tests/poster-3items-square.png' });
  console.log('✓ saved tests/poster-3items-square.png');
});

test('截图: 1 条竖版海报', async ({ page }) => {
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("急救 心脏骤停")').click();
  await page.waitForTimeout(800);
  await page.locator('button[aria-pressed]').filter({ hasText: '竖版' }).click();
  await page.waitForTimeout(3000);
  const preview = page.locator('img[alt*="海报预览"]');
  await expect(preview).toBeVisible();
  await preview.screenshot({ path: 'tests/poster-1item-story.png' });
  console.log('✓ saved tests/poster-1item-story.png');
});
