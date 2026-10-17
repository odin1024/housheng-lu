// 检查 explore 页面 + 海报 + footer
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test('explore 页面 + 左侧菜单', async ({ page }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 全屏截图
  await page.screenshot({ path: 'tests/explore-full.png', fullPage: false });
  console.log('✓ saved tests/explore-full.png');

  // 滚到中段截图
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/explore-scrolled.png' });
  console.log('✓ saved tests/explore-scrolled.png');

  // 测试: 点击"章节"第 1 节, 看是否生效
  const beforeText = await page.locator('main').textContent();
  const beforeCount = (beforeText?.match(/共\s*(\d+)\s*条/) || [])[1];
  console.log(`点击前: 共 ${beforeCount} 条`);

  // 点击第 1 节 checkbox
  await page.locator('label:has-text("1. 不要早死")').first().locator('input').check();
  await page.waitForTimeout(500);
  const afterText = await page.locator('main').textContent();
  const afterCount = (afterText?.match(/共\s*(\d+)\s*条/) || [])[1];
  console.log(`点击第1节后: 共 ${afterCount} 条`);

  // 测试: 点击"性价比-极高"
  await page.locator('label:has-text("极高")').first().locator('input').check();
  await page.waitForTimeout(500);
  const ratioText = await page.locator('main').textContent();
  const ratioCount = (ratioText?.match(/共\s*(\d+)\s*条/) || [])[1];
  console.log(`点击第1节+极高后: 共 ${ratioCount} 条`);
});

test('海报右下角印章显示', async ({ page }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("急救 心脏骤停")').click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("生成预览")').click();
  await page.waitForTimeout(2000);
  // 选方形看 1 条
  const preview = page.locator('img[alt*="海报预览"]');
  await expect(preview).toBeVisible();
  const box = await preview.boundingBox();
  if (box) {
    // 重点截印章区域 (右下角)
    await page.screenshot({
      path: 'tests/poster-bottom-seal.png',
      clip: { x: box.x + box.width * 0.5, y: box.y + box.height * 0.8, width: box.width * 0.5, height: box.height * 0.2 },
    });
    console.log('✓ saved tests/poster-bottom-seal.png');
  }
});

test('footer 钤印 SVG vs 实际渲染对比', async ({ page }) => {
  test.setTimeout(20000);
  // 1. 直接加载 SVG 文件
  const svgRes = await page.goto(BASE + '/logo/seal-end.svg');
  expect(svgRes?.status()).toBe(200);
  const svgContent = await page.content();
  // 检查 viewBox
  const hasViewBox = svgContent.includes('viewBox="0 0 120 40"');
  console.log(`seal-end.svg 有 viewBox 0 0 120 40: ${hasViewBox}`);
  await page.screenshot({ path: 'tests/seal-end-direct.png' });
});
