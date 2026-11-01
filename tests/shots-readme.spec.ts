// 生成 README 用的宣传物料: 横幅 + 各页面截图 (产物写入 docs/assets/, 需先 pnpm build && pnpm start)
import { test } from '@playwright/test';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:3000';
const OUT = 'docs/assets';

/** 从数据里读真实数字, 避免横幅上的数字随上游同步而过时 */
function dataCounts() {
  const entries = JSON.parse(readFileSync('data/entries.json', 'utf-8')) as Array<{
    section: number;
    evidenceLevel: string;
  }>;
  return {
    total: entries.length,
    sections: new Set(entries.map((e) => e.section)).size,
    evidenceA: entries.filter((e) => e.evidenceLevel === 'A').length,
  };
}

test('渲染宣传横幅', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 420 });

  // fixture 里的 <img src="public/logo/..."> 是相对路径, 而 fixture 在 tests/fixtures/ 下;
  // 且 setContent 在 about:blank 里加载 file:// 子资源会被拦, 所以直接把 SVG 内联成 data URL。
  const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'readme-banner.html');
  const logoSvg = readFileSync(join(process.cwd(), 'public', 'logo', 'seal-end.svg'), 'utf-8');
  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
  const html = readFileSync(fixturePath, 'utf-8').replace('public/logo/seal-end.svg', logoDataUrl);
  await page.setContent(html, { waitUntil: 'load' });

  // 用真实数据覆盖 HTML 里的占位数字
  const counts = dataCounts();
  await page.evaluate((c) => {
    const nums = document.querySelectorAll('.stat .n');
    [c.total, c.sections, c.evidenceA].forEach((v, i) => {
      if (nums[i]) nums[i].textContent = String(v);
    });
  }, counts);

  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/banner.png` });
  console.log(`   ✅ banner.png (${counts.total} 条 / ${counts.sections} 章 / ${counts.evidenceA} 条 A 级)`);
});

test('桌面端页面截图', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });

  // 1) 首页（横幅 + 首屏）
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/shot-home.png` });

  // 2) 长卷（滚到卷轴区）
  await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll('div,section')).find((el) =>
      (el.textContent || '').includes('长 卷 · 136 颗印章'),
    );
    if (h) h.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/shot-scroll.png` });

  // 3) 人生阶段
  await page.evaluate(() => {
    const h2 = Array.from(document.querySelectorAll('h2')).find((h) => (h.textContent || '').includes('人生阶段'));
    if (h2) h2.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/shot-stages.png` });

  // 4) 检索
  await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/shot-explore.png` });

  // 5) 问卷（问一个真问题，拿到 AI 回答）
  await page.goto(BASE + '/ask', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.fill('#q-input', '心脏骤停怎么办?');
  await page.locator('button:has-text("问 卷")').click();
  await page.locator('[data-testid="ask-result"]').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(800);
  // 把回答滚到视口顶部, 截"问题 + 急方卡 + AI 回答 + 引用"这一段, 而不是只截输入框
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ask-result"]');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/shot-ask.png` });

  // 6) 急方（列表 + 一个场景）
  await page.goto(BASE + '/emergency', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/shot-emergency.png` });

  await page.goto(BASE + '/emergency/' + encodeURIComponent('心脏骤停'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/shot-emergency-detail.png` });

  // 7) 矩阵
  await page.goto(BASE + '/matrix', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/shot-matrix.png` });

  // 8) 海报
  await page.goto(BASE + '/poster', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/shot-poster.png` });
});

test('手机端截图', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/shot-home-mobile.png` });

  await page.goto(BASE + '/emergency/' + encodeURIComponent('心脏骤停'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/shot-emergency-mobile.png` });
});
