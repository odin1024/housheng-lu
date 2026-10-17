// 实测 emergency hover 状态
import { test } from '@playwright/test';
const BASE = 'http://127.0.0.1:3000';
test('check emergency hover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/emergency');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  // 取第 1 个卡片
  const card = page.locator('a[href*="/emergency/"]').first();
  const before = await card.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      border: cs.borderColor,
    };
  });
  console.log('before hover:', before);
  await card.hover();
  await page.waitForTimeout(300);
  const after = await card.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      border: cs.borderColor,
    };
  });
  console.log('after hover:', after);
  // 截屏
  await page.screenshot({ path: 'tests/screenshots/emergency-hover.png' });
});
