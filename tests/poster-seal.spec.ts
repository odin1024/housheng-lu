// 截图海报右下角印章区域
import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';

const BASE = 'http://localhost:3000';

test('海报右下角印章', async ({ page }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("急救 心脏骤停")').click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("生成预览")').click();
  await page.waitForTimeout(2500);
  const preview = page.locator('img[alt*="海报预览"]');
  await expect(preview).toBeVisible();
  const box = await preview.boundingBox();
  console.log('Preview box:', box);
  if (box) {
    // 截右下角 (含印章)
    await page.screenshot({
      path: 'tests/poster-corner.png',
      clip: {
        x: box.x + box.width * 0.55,
        y: box.y + box.height * 0.7,
        width: box.width * 0.45,
        height: box.height * 0.3,
      },
    });
  }
  // 也截全图
  await preview.screenshot({ path: 'tests/poster-full.png' });
});
