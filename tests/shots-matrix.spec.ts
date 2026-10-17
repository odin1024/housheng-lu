// 出图: 决策矩阵 + 检索页的"性价比"标记
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('决策矩阵页', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(BASE + '/matrix');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'tests/screenshots/out-matrix.png', fullPage: true });
  const info = await page.evaluate(() => {
    const btn = document.querySelector('table button') as HTMLButtonElement;
    const cellTexts = Array.from(document.querySelectorAll('table button')).map((b) =>
      (b.textContent || '').replace(/\s+/g, ' ').trim(),
    );
    return { firstCell: btn?.textContent?.replace(/\s+/g, ' ').trim(), cellCount: cellTexts.length, cells: cellTexts };
  });
  console.log('MATRIX:', JSON.stringify(info));
});

test('检索页性价比标记', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
  const badges = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('article')).slice(0, 6);
    return rows.map((r) => {
      const title = r.querySelector('h3')?.textContent?.trim().slice(0, 14);
      const tags = Array.from(r.querySelectorAll('span')).map((s) => s.textContent?.trim());
      return { title, tags: tags.filter((t) => t && t.length <= 4) };
    });
  });
  console.log('EXPLORE BADGES:', JSON.stringify(badges, null, 0));
  await page.screenshot({ path: 'tests/screenshots/out-explore-ratio.png', clip: { x: 240, y: 150, width: 1040, height: 560 } });
});
