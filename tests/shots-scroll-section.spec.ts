// 长卷整段出图 (起始 + 跳到第 12 节)
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
const CHROME = '[data-testid="scroll-chrome"]';

test('长卷整段出图', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const section = page.locator('section[aria-label="七百余条生计长卷"]');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await section.screenshot({ path: 'tests/screenshots/out-scroll-section-start.png' });

  await page.locator(`${CHROME} button[title="第 12 节"]`).first().click();
  await page.waitForTimeout(1400);
  await section.screenshot({ path: 'tests/screenshots/out-scroll-section-mid.png' });
});
