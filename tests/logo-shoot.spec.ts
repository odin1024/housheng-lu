// 6 个 logo 版本截图
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const VERSIONS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'];

test('logo 6 个版本截图', async ({ page }) => {
  test.setTimeout(60000);
  for (const v of VERSIONS) {
    const res = await page.goto(`${BASE}/logo-preview/${v}`, { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    await page.waitForTimeout(500);
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    await svg.screenshot({ path: `tests/logo-${v}.png` });
    console.log(`✓ saved tests/logo-${v}.png`);
  }
});
