// 导航: 确认"卷端"存在、当前页标示正确、桌面不换行、移动端不重复
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

async function navItems(page: any) {
  return page.evaluate(() => {
    const nav = document.querySelector('header nav[aria-label="主导航"]') as HTMLElement | null;
    if (!nav) return null;
    const cs = getComputedStyle(nav);
    return {
      labels: Array.from(nav.querySelectorAll('a')).map((a) => a.textContent?.trim()),
      current: Array.from(nav.querySelectorAll('a'))
        .filter((a) => a.getAttribute('aria-current') === 'page')
        .map((a) => a.textContent?.trim()),
      navWidth: Math.round(nav.getBoundingClientRect().width),
      navHeight: Math.round(nav.getBoundingClientRect().height),
      flexWrap: cs.flexWrap,
    };
  });
}

test('首页: 卷端为当前页', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  console.log('[/]', JSON.stringify(await navItems(page)));
  await page.screenshot({ path: 'tests/screenshots/out-nav2-home.png', clip: { x: 0, y: 0, width: 1280, height: 90 } });
});

test('检索页: 卷端非当前页', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/explore');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  console.log('[/explore]', JSON.stringify(await navItems(page)));
  await page.screenshot({ path: 'tests/screenshots/out-nav2-explore.png', clip: { x: 0, y: 0, width: 1280, height: 90 } });
});

test('768px 窄屏: 导航不换行', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  console.log('[768]', JSON.stringify(await navItems(page)));
  await page.screenshot({ path: 'tests/screenshots/out-nav2-768.png', clip: { x: 0, y: 0, width: 768, height: 90 } });
});

test('移动端菜单: 卷端只出现一次且首页高亮', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  await page.click('button[aria-expanded]');
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const nav = document.querySelector('header nav[aria-label="移动端导航"]') as HTMLElement;
    const links = Array.from(nav.querySelectorAll('a'));
    return {
      labels: links.map((a) => a.textContent?.trim()),
      current: links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent?.trim()),
      juanDuanCount: links.filter((a) => a.textContent?.trim() === '卷端').length,
    };
  });
  console.log('[mobile]', JSON.stringify(info));
  await page.screenshot({ path: 'tests/screenshots/out-nav2-mobile.png', clip: { x: 0, y: 0, width: 390, height: 520 } });
});
