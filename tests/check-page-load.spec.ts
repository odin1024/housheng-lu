// 验证 dev server 正常加载
import { test, expect } from '@playwright/test';
const BASE = 'http://127.0.0.1:3000';
test('各页面能正常加载', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text().slice(0, 200));
  });
  for (const path of ['/', '/explore', '/book/10-23', '/about', '/poster', '/ask', '/emergency', '/matrix', '/my']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const title = await page.title();
    console.log(`${path}: title="${title}"`);
  }
  console.log('Total errors:', errors.length);
  errors.forEach(e => console.log(' -', e.slice(0, 150)));
  expect(errors.length).toBe(0);
});
