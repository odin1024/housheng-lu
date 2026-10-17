// 直接看海报预览完整图
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test('海报预览 - 1 条方形 (完整截图)', async ({ page }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("急救 心脏骤停")').click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("生成预览")').click();
  await page.waitForTimeout(3000);
  const preview = page.locator('img[alt*="海报预览"]');
  await expect(preview).toBeVisible();
  const box = await preview.boundingBox();
  console.log('Preview box:', box);
  // 截整个预览图 (让 preview 自己定大小)
  await preview.screenshot({ path: 'tests/poster-direct.png' });
});
