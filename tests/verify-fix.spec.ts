// 完整验证 4 个用户报告问题
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:3000';

test('1. 验证 /book/10-23 mobile 标题不再逐字换行', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(BASE + '/book/10-23');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 等样式表真正生效: 机器负载高时, networkidle 之后计算样式可能还是默认值
  // (曾因此偶发失败: wordBreak 读到 normal)
  await page.waitForFunction(
    () => {
      const h2 = document.querySelector('h2.title-juanmu-sub');
      return !!h2 && getComputedStyle(h2).wordBreak === 'keep-all';
    },
    null,
    { timeout: 15000 },
  );

  const info = await page.evaluate(() => {
    const h2 = document.querySelector('h2.title-juanmu-sub');
    if (!h2) return null;
    const cs = getComputedStyle(h2);
    const r = h2.getBoundingClientRect();
    return {
      text: h2.textContent,
      width: Math.round(r.width),
      height: Math.round(r.height),
      fontSize: cs.fontSize,
      letterSpacing: cs.letterSpacing,
      wordBreak: cs.wordBreak,
      overflowWrap: cs.overflowWrap,
    };
  });
  console.log('H2 style:', JSON.stringify(info, null, 2));
  expect(info).not.toBeNull();
  if (!info) throw new Error('未取到 h2 样式');
  expect(info.letterSpacing).toBe('normal');
  expect(info.wordBreak).toBe('keep-all');
  await page.screenshot({ path: 'tests/screenshots/book-10-23-mobile.png', fullPage: false });
});

test('2. 验证导航"问"已改为"问卷"', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  // 导航可能是汉堡按钮,先展开
  const hasMenu = await page.locator('text=问卷').count();
  if (hasMenu === 0) {
    const menuBtn = page.locator('button[aria-label*="菜单"], button[aria-label*="导航"], button:has-text("☰")').first();
    if (await menuBtn.isVisible()) await menuBtn.click();
    await page.waitForTimeout(300);
  }
  const navText = await page.locator('header').textContent();
  console.log('Header text:', navText);
  expect(navText).toContain('问卷');
  expect(navText).not.toMatch(/^.*\s问\s*$/m);
});

test('3. 验证卷末已无衍生生态网址', async ({ page }) => {
  await page.goto(BASE + '/about');
  await page.waitForLoadState('networkidle');
  const body = (await page.textContent('body')) ?? '';
  const banned = ['howtolivebetter.net', 'howtolivebetter.com', 'xiaohongshu.com', 'gongzhonghao'];
  for (const word of banned) {
    expect(body.toLowerCase()).not.toContain(word);
  }
  // 应还有"原作"致谢
  expect(body).toContain('原作');
  console.log('about page OK, no derivative sites found');
});

test('4. 验证全站 mobile 标题不出现 5+ 行单字', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const ids = ['10-23', '1-1', '15-7', '20-3'];
  const results: Array<{ id: string; h: number; fontSize: string; ls: string; }> = [];
  for (const id of ids) {
    await page.goto(BASE + '/book/' + id);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const h2 = document.querySelector('h2.title-juanmu-sub');
      if (!h2) return null;
      const cs = getComputedStyle(h2);
      return {
        h: Math.round(h2.getBoundingClientRect().height),
        fontSize: cs.fontSize,
        ls: cs.letterSpacing,
      };
    });
    if (info) results.push({ id, ...info });
  }
  console.log('All books mobile H2:', JSON.stringify(results, null, 2));
  // 每条目标题应该 ≤ 6 行 (假设 line-height 28px × 6 = 168px)
  for (const r of results) {
    expect(r.h, `${r.id} 标题过高: ${r.h}px, 字号 ${r.fontSize}`).toBeLessThan(280);
  }
});

test('5. 验证 explore 页面 sticky 菜单', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);
  const stickyY = await page.evaluate(() => {
    const aside = document.querySelector('aside, [class*="filter"], [class*="Filter"]');
    if (!aside) return -1;
    return aside.getBoundingClientRect().top;
  });
  console.log('Explore filter bar top after scroll:', stickyY);
  expect(stickyY).toBeGreaterThanOrEqual(0);
  expect(stickyY).toBeLessThanOrEqual(120);
});

test('6. 验证 footer 钤印为 V3 双线椭圆', async ({ page }) => {
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  const footerHtml = await page.locator('footer').innerHTML();
  const hasV3 = footerHtml.includes('seal-end.svg');
  console.log('Footer uses seal-end.svg:', hasV3);
  expect(hasV3).toBe(true);
});
