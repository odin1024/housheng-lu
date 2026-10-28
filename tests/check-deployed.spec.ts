// 部署后验证: 对**已上线**的站点跑一遍关键检查
//
//   PUBLIC_BASE_URL=https://odin1024.github.io/housheng-lu npx playwright test check-deployed --workers=1
//
// 为什么单独写一个:
//   静态托管(子路径部署)最容易坏的就是**根相对路径** —— 原生 <img src="/logo/x.svg">、
//   metadata 里的 icons/manifest 不会自动加 basePath, 会去域名根找 → 全 404。
//   这个用例就是守这一类的: 资源不许有 4xx、站内链接必须带 basePath、横幅与深页可用。
import { test, expect } from '@playwright/test';

const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || '';
const BASE_PATH = PUBLIC_BASE ? new URL(PUBLIC_BASE).pathname.replace(/\/$/, '') : '';

test('已部署站点可用性 (资源/basePath/横幅/深页)', async ({ page }) => {
  test.skip(!PUBLIC_BASE, '未设置 PUBLIC_BASE_URL, 跳过线上验证');

  test.setTimeout(180_000);
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 100)}`);
  });

  await page.goto(PUBLIC_BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 1) 横幅
  const banner = page.locator('aside[aria-label="开源信息"]');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('CC BY 4.0');

  // 2) 站内链接必须带 basePath
  if (BASE_PATH) {
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href^="/"]')).map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''),
    );
    const bad = hrefs.filter((h) => h.startsWith('/') && !h.startsWith(BASE_PATH));
    expect(bad, `这些链接没带 basePath: ${bad.slice(0, 5).join(', ')}`).toEqual([]);
  }

  // 3) 客户端路由跳转 (线上要下 /explore 的 2.4MB 客户端包, 用等待而不是固定 sleep)
  await page.locator('header a[href*="/explore"]').first().click();
  await expect(page.locator('.entry-card').first()).toBeVisible({ timeout: 45_000 });
  expect(await page.locator('.entry-card').count()).toBeGreaterThan(0);

  // 4) 深页(条目详情)
  await page.goto(PUBLIC_BASE + '/book/13-01/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await expect(page.locator('body')).toContainText('心肺复苏');

  // 5) 无 4xx/5xx 资源 (子路径部署最常见的坑)
  expect(failed, `资源加载失败: ${failed.slice(0, 6).join(' | ')}`).toEqual([]);
});
