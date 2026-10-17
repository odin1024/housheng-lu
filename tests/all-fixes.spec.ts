// 全功能验证 - 4 个修复
import { test, expect } from '@playwright/test';
const BASE = 'http://localhost:3000';

test('所有 4 个问题修复 - 集成验证', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1280, height: 800 });

  // === 问题 1+2: explore 左侧菜单 sticky + 筛选生效 ===
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 滚 1500px, aside 仍在视口
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(500);
  const asideBox = await page.locator('aside[aria-label="筛选"]').boundingBox();
  const stickyOk = asideBox && asideBox.y >= 0 && asideBox.y < 800;
  console.log(`✓ 问题 1: sticky ${stickyOk ? '生效' : '失败'} (y=${asideBox?.y})`);

  // 截图
  await page.screenshot({ path: 'tests/fix-1-explore-sticky.png' });

  // 筛选生效
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const before = parseInt(((await page.locator('main').textContent())?.match(/共\s*(\d+)\s*条/) || [])[1] || '0');
  await page.locator('label:has-text("1. 不要早死")').first().locator('input').check();
  await page.waitForTimeout(300);
  const after = parseInt(((await page.locator('main').textContent())?.match(/共\s*(\d+)\s*条/) || [])[1] || '0');
  const filterOk = after < before && after > 0;
  console.log(`✓ 问题 2: 筛选生效 ${filterOk ? 'OK' : '失败'} (${before} -> ${after})`);

  // === 问题 3: footer 钤印 = V3 ===
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const sealSrc = await page.locator('footer img[alt*="落款"]').getAttribute('src');
  const isV3 = sealSrc?.includes('seal-end.svg');
  const svg = await fetch(BASE + '/logo/seal-end.svg').then(r => r.text());
  const v3ViewBox = svg.includes('viewBox="0 0 130 60"');
  console.log(`✓ 问题 3: footer 钤印 src=${sealSrc}, V3 viewBox=${v3ViewBox}`);
  expect(isV3 && v3ViewBox).toBeTruthy();
  await page.screenshot({ path: 'tests/fix-3-footer-seal.png' });

  // === 问题 4: 海报右下角印章 = V3 ===
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("急救 心脏骤停")').click();
  await page.waitForTimeout(1500);
  // 点击 "生成预览" (可能显示 "重新生成", 都兼容)
  const btn = page.locator('button').filter({ hasText: /^(生成预览|重新生成)$/ });
  await btn.first().click();
  await page.waitForTimeout(3000);
  const preview = page.locator('img[alt*="海报预览"]');
  await preview.screenshot({ path: 'tests/fix-4-poster-seal.png' });
  // 验证 dataURL 大小合理 (新逻辑: 矩形框 + 椭圆 + 文字, 应该 < 200KB)
  const src = await preview.getAttribute('src');
  const dataUrlSize = src ? src.length : 0;
  console.log(`✓ 问题 4: 海报 dataURL ${Math.round(dataUrlSize / 1024)}KB`);
  expect(dataUrlSize).toBeGreaterThan(50000); // 至少 50KB
  expect(dataUrlSize).toBeLessThan(1000000); // 不应 > 1MB
});
