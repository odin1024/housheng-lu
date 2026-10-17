// 复现 hydration 错误
import { test } from '@playwright/test';
const BASE = 'http://localhost:3000';
test('check all pages for hydration', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
  });
  for (const path of ['/', '/explore', '/book/12-08', '/about', '/ask', '/emergency', '/matrix', '/poster']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  }
  console.log('Total errors:', errors.length);
  errors.forEach((e) => console.log(' -', e.slice(0, 200)));
});
