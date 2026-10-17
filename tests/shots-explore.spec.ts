// 出图: 检索页与单条详情页, 检查正文对齐
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('检索页正文对齐', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tests/screenshots/out-explore-body.png', fullPage: false });
  const info = await page.evaluate(() => {
    const el = document.querySelector('.plain-language') as HTMLElement;
    const h3 = el?.parentElement?.querySelector('h3') as HTMLElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      textAlign: cs.textAlign,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      padding: cs.padding,
      blockLeft: Math.round(el.getBoundingClientRect().left + parseFloat(cs.paddingLeft)),
      titleLeft: h3 ? Math.round(h3.getBoundingClientRect().left) : null,
    };
  });
  console.log('explore .plain-language:', JSON.stringify(info));
});

test('详情页正文对齐', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/book/10-23');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tests/screenshots/out-book-lead.png', fullPage: false });
  const info = await page.evaluate(() => {
    const el = document.querySelector('.plain-language') as HTMLElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { cls: el.className, textAlign: cs.textAlign, fontSize: cs.fontSize, lineHeight: cs.lineHeight };
  });
  console.log('book .plain-language:', JSON.stringify(info));
});
