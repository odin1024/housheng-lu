// 长卷装裱效果出图 + 几何核对
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('长卷装裱: 页边距/框/轴头', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  const geo = await page.evaluate(() => {
    const frame = document.querySelector('.scroll-frame') as HTMLElement;
    const pan = document.querySelector('.scroll-pan') as HTMLElement;
    const rollers = Array.from(document.querySelectorAll('.scroll-roller')) as HTMLElement[];
    const fr = frame.getBoundingClientRect();
    const pr = pan.getBoundingClientRect();
    return {
      frameLeft: Math.round(fr.left),
      frameRight: Math.round(window.innerWidth - fr.right),
      frameWidth: Math.round(fr.width),
      viewport: window.innerWidth,
      panWidth: Math.round(pr.width),
      framePadding: getComputedStyle(frame).padding,
      frameBorder: getComputedStyle(frame).borderTopWidth,
      rollers: rollers.length,
      rollerBoxes: rollers.map((r) => {
        const b = r.getBoundingClientRect();
        return { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) };
      }),
      // 首枚印章距框左边距 (引首留白)
      firstSealGap: (() => {
        const seal = document.querySelector('.seal-link rect') as SVGRectElement | null;
        if (!seal) return null;
        const sb = seal.getBoundingClientRect();
        return Math.round(sb.left - pr.left);
      })(),
    };
  });
  console.log('几何:', JSON.stringify(geo, null, 1));
  expect(geo.rollers).toBe(2);
  expect(geo.frameLeft).toBeGreaterThan(16); // 有页边距, 不再通栏
  expect(geo.frameRight).toBeGreaterThan(16);

  const section = page.locator('section[aria-label="七百余条生计长卷"]');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await section.screenshot({ path: 'tests/screenshots/out-scroll-framed.png' });
});
