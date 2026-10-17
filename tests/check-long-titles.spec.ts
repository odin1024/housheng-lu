// 章节标题变长后 (带副标题), 检索页侧栏/整页是否被撑破
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('检索页: 长章节名不撑破布局', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const aside = document.querySelector('aside') as HTMLElement | null;
    const labels = Array.from(document.querySelectorAll('aside label, aside li')).slice(0, 40);
    const overflowing = labels
      .filter((el) => (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 2)
      .map((el) => (el.textContent || '').trim().slice(0, 24));
    return {
      asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : null,
      bodyOverflowX: document.body.scrollWidth > window.innerWidth,
      overflowing,
    };
  });
  console.log('检索页布局:', JSON.stringify(info));
  expect(info.bodyOverflowX).toBe(false);
  await page.screenshot({ path: 'tests/screenshots/out-explore-sidebar.png', clip: { x: 0, y: 90, width: 330, height: 640 } });
});

test('长卷: 长章节名在色条上不串行', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const bands = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.scroll-pan [title^="第 "]'));
    return nodes.map((n) => {
      const el = n as HTMLElement;
      const label = el.lastElementChild as HTMLElement;
      return {
        text: (el.textContent || '').trim(),
        bandW: Math.round(el.getBoundingClientRect().width),
        labelOverflow: label ? label.scrollWidth > label.clientWidth + 2 : false,
      };
    });
  });
  const truncated = bands.filter((b) => b.labelOverflow).map((b) => b.text);
  console.log(`色条宽 ${bands[0]?.bandW}px; 因过长被省略号截断的章节: ${truncated.length} 个`);
  if (truncated.length) console.log('  ' + truncated.join(' | '));
  expect(bands.length).toBe(34);
});
