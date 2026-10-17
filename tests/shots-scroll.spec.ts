// 长卷交互: 刻度/进度/键盘/跳转/吸附 + 印章悬停
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
const CHROME = '[data-testid="scroll-chrome"]';

test('长卷: 结构与交互', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const pan = page.locator('.scroll-pan');
  await pan.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // 1. 刻度数量 = 章节数, 读数区
  const ticks = await page.locator(`${CHROME} button[title^="第"]`).count();
  const readout = await page.locator(CHROME).innerText();
  console.log('刻度数:', ticks, '| 读数区:', readout.replace(/\n/g, ' / '));
  expect(ticks).toBe(34);

  // 2. 键盘: 聚焦后按 End 应滚向末尾
  await pan.focus();
  await pan.press('End');
  await page.waitForTimeout(700);
  const afterEnd = await page.evaluate(() => {
    const el = document.querySelector('.scroll-pan') as HTMLElement;
    return { left: Math.round(el.scrollLeft), max: el.scrollWidth - el.clientWidth };
  });
  console.log('按 End 后:', JSON.stringify(afterEnd));
  expect(afterEnd.left).toBeGreaterThan(0);

  // 3. 点某个刻度跳转 (第 20 节)
  await page.locator(`${CHROME} button[title="第 20 节"]`).first().click();
  await page.waitForTimeout(900);
  const afterJump = await page.evaluate(() =>
    Math.round((document.querySelector('.scroll-pan') as HTMLElement).scrollLeft),
  );
  console.log('点第20节刻度后 scrollLeft:', afterJump);
  expect(afterJump).toBeGreaterThan(1000);

  // 4. 进度条宽度应随滚动变化
  const barW = await page.evaluate((sel) => {
    const bar = document.querySelector(`${sel} div[aria-hidden="true"] div`) as HTMLElement;
    return bar ? bar.style.width : null;
  }, CHROME);
  console.log('进度条宽度:', barW);
  expect(barW).toBeTruthy();

  await page.screenshot({
    path: 'tests/screenshots/out-scroll-jumped.png',
    clip: { x: 0, y: 260, width: 1280, height: 420 },
  });
});

test('长卷: 悬停印章浮起', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
  const link = page.locator('.seal-link').first();
  await link.scrollIntoViewIfNeeded();
  const before = await link.evaluate((el) => getComputedStyle(el.querySelector('.seal-item')!).transform);
  await link.hover();
  await page.waitForTimeout(350);
  const after = await link.evaluate((el) => getComputedStyle(el.querySelector('.seal-item')!).transform);
  console.log('印章 transform 悬停前:', before, '→ 悬停后:', after);
  expect(after).not.toBe(before);
  await page.screenshot({
    path: 'tests/screenshots/out-scroll-hover.png',
    clip: { x: 0, y: 400, width: 900, height: 260 },
  });
});
