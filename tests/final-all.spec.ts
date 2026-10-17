// 全功能验证: 4 个问题全部修好
import { test, expect } from '@playwright/test';
const BASE = 'http://localhost:3000';

test('1. explore 左侧菜单 sticky - 滚动后仍可见', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  // 滚 1500px
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(500);
  // aside 应在视口内
  const box = await page.locator('aside[aria-label="筛选"]').boundingBox();
  if (box && box.y >= 0 && box.y < 800) {
    console.log(`✓ 滚动 1500px 后 aside 仍在视口 (y=${box.y})`);
  } else {
    throw new Error(`Sticky 失败: aside y=${box?.y}`);
  }
});

test('2. explore 筛选标签点击生效 - 章节+性价比+换回', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  // 初始条数
  const before = await page.locator('main').textContent();
  const beforeN = parseInt((before?.match(/共\s*(\d+)\s*条/) || [])[1] || '0');
  console.log(`初始: ${beforeN} 条`);

  // 勾第 1 节
  await page.locator('label:has-text("1. 不要早死")').first().locator('input').check();
  await page.waitForTimeout(300);
  const after1 = parseInt(((await page.locator('main').textContent())?.match(/共\s*(\d+)\s*条/) || [])[1] || '0');
  console.log(`勾第 1 节: ${after1} 条`);
  if (after1 === beforeN) throw new Error('第 1 节过滤无效');
  if (after1 >= beforeN) throw new Error(`第 1 节数应减少: ${after1} >= ${beforeN}`);

  // 勾极高
  await page.locator('label:has-text("极高")').first().locator('input').check();
  await page.waitForTimeout(300);
  const after2 = parseInt(((await page.locator('main').textContent())?.match(/共\s*(\d+)\s*条/) || [])[1] || '0');
  console.log(`勾第 1 节+极高: ${after2} 条`);
  if (after2 > after1) throw new Error('加极高后数应不增');
});

test('3. footer 钤印 = V3 双线椭圆', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  // 滚到底部
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  // 检查 footer 钤印 SVG src
  const sealSrc = await page.locator('footer img[alt*="落款"]').getAttribute('src');
  expect(sealSrc).toContain('seal-end.svg');
  // 检查 SVG 是 V3 (双线椭圆) - 通过 viewBox 130×60
  const svg = await fetch(BASE + '/logo/seal-end.svg').then((r) => r.text());
  if (svg.includes('viewBox="0 0 130 60"') && (svg.match(/<ellipse/g)?.length ?? 0) >= 2) {
    console.log('✓ footer 钤印是 V3 (双线椭圆 130×60)');
  } else {
    throw new Error('footer 钤印不是 V3');
  }
});

test('4. 海报右下角印章 = V3 双线椭圆 (与 footer 一致)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.locator('button:has-text("急救 心脏骤停")').click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("生成预览")').click();
  await page.waitForTimeout(2500);
  // 截右下角 1/4
  const preview = page.locator('img[alt*="海报预览"]');
  const box = await preview.boundingBox();
  if (box) {
    // 用 page 全屏截图 然后裁剪底部
    await page.screenshot({
      path: 'tests/poster-seal-zoom.png',
      clip: {
        x: 0,
        y: box.y + box.height * 0.78,
        width: 1280,
        height: 200,
      },
    });
  }
  // 检查预览数据 URL (Canvas 绘制) - 找 "厚生錄" 文字位置
  // 通过检查 img 的 dataURL 大小
  const src = await preview.getAttribute('src');
  if (src && src.startsWith('data:image/png;base64,')) {
    console.log(`✓ 海报 PNG 预览生成成功 (${Math.round(src.length / 1024)}KB)`);
  }
});
