import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('卷尾状态出图', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const el = document.querySelector('.scroll-pan') as HTMLElement;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = el.scrollWidth;
    el.style.scrollBehavior = prev;
  });
  await page.waitForTimeout(600);
  const section = page.locator('section[aria-label="七百余条生计长卷"]');
  await section.screenshot({ path: 'tests/screenshots/out-scroll-end.png' });
});
