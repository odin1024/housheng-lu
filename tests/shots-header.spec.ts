// 出图: 导航当前页标示 (桌面 + 移动)
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

async function navState(page: any) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('header nav a')) as HTMLElement[];
    return links.map((a) => {
      const cs = getComputedStyle(a);
      return {
        text: a.textContent?.trim(),
        current: a.getAttribute('aria-current') || '',
        color: cs.color,
        bold: cs.fontWeight,
        underline: cs.borderBottomWidth + ' ' + cs.borderBottomColor,
      };
    });
  });
}

test('首页导航: 检索为当前页', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tests/screenshots/out-nav-home.png', clip: { x: 0, y: 0, width: 1440, height: 90 } });
  console.log('[/]', JSON.stringify(await navState(page), null, 0));
});

test('急方页导航: 急方为当前页', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/emergency');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tests/screenshots/out-nav-emergency.png', clip: { x: 0, y: 0, width: 1440, height: 90 } });
  console.log('[/emergency]', JSON.stringify(await navState(page), null, 0));
});

test('移动端菜单: 急方为当前页', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/emergency');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.click('button[aria-expanded]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/screenshots/out-nav-mobile.png', clip: { x: 0, y: 0, width: 390, height: 520 } });
  console.log('mobile ok');
});
