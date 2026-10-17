// 验证 4 个修复
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test('explore 左侧菜单 sticky 修复', async ({ page }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 顶部截图
  await page.screenshot({ path: 'tests/explore-fixed-top.png' });
  console.log('✓ saved explore-fixed-top.png');

  // 滚动 800px - 检查左侧菜单是否还在视口内
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/explore-fixed-scrolled.png' });
  console.log('✓ saved explore-fixed-scrolled.png');

  // 检查 aside 的位置 (应该在视口内, sticky)
  const asideBox = await page.locator('aside[aria-label="筛选"]').boundingBox();
  console.log('Aside box:', asideBox);
  if (asideBox && asideBox.y >= 0 && asideBox.y < 800) {
    console.log('✓ aside 在视口内 (sticky 生效)');
  } else {
    console.log('✗ aside 不在视口内, sticky 失败');
  }
});

test('海报 - 钤印 + 落款新布局', async ({ page }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("急救 心脏骤停")').click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("生成预览")').click();
  await page.waitForTimeout(2500);
  const preview = page.locator('img[alt*="海报预览"]');
  await expect(preview).toBeVisible();
  await preview.screenshot({ path: 'tests/poster-new-seal.png' });
  console.log('✓ saved poster-new-seal.png');
});
