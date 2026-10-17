// 卷末页: 整页出图 + 关键内容核对
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('卷末页', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/about');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tests/screenshots/out-about-full.png', fullPage: true });

  const check = await page.evaluate(() => {
    const txt = document.body.innerText;
    const links = Array.from(document.querySelectorAll('main a')) as HTMLAnchorElement[];
    return {
      hasSyncSection: txt.includes('同步状态'),
      hasLastSync: /上次同步: \d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(txt) || txt.includes('上次同步:'),
      hasLicenseLinks: links.some((a) => a.href.includes('creativecommons.org/licenses/by/4.0')),
      hasMit: links.some((a) => a.href.includes('LICENSE-CODE')),
      hasUpstreamCommit: links.some((a) => /HowToLiveBetter\/commit\/[0-9a-f]{7}/.test(a.href)),
      hasWorkflowLink: links.some((a) => a.href.includes('workflows/sync.yml')),
      emptyTargetLinks: links.filter((a) => !a.textContent?.trim()).length,
    };
  });
  console.log('ABOUT CHECK:', JSON.stringify(check));
});
