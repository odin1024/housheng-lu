import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

/**
 * 回归: 摘要化改造后, 展开条目必须能按需拉到全文
 *
 * 背景:
 *   为把 1.3MB 的完整条目数据从客户端 bundle 挪走, 改成了:
 *     · 常驻: data/entry-summaries.json (357KB)
 *     · 按需: public/entry-detail/<id>.json (单个约 1.3KB), 展开时 fetch
 *   所以"展开"这条路径从"数据就在内存里"变成了"要发一次网络请求" —— 必须测。
 */
test.describe('按需加载条目详情', () => {
  test('展开后能显示收益与出处', async ({ page }) => {
    await page.goto(BASE + '/explore/', { waitUntil: 'domcontentloaded' });

    const card = page.locator('.entry-card').first();
    await expect(card).toBeVisible({ timeout: 30_000 });

    // 展开前: 详情字段不该在 DOM 里
    await expect(card.locator('text=出 处')).toHaveCount(0);

    // 点"卷开"
    await card.getByRole('button', { name: /卷开/ }).click();

    // 展开后应出现 出处 / 收益 段落
    await expect(card.locator('text=出 处')).toBeVisible({ timeout: 15_000 });
    await expect(card.locator('text=收 益')).toBeVisible();

    // 出处里应该有可点的原文链接
    const sourceLink = card.locator('a[href^="http"]').first();
    await expect(sourceLink).toBeVisible();
  });

  test('分片请求真实发出 (不是本地假数据)', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/entry-detail/')) requests.push(r.url());
    });

    await page.goto(BASE + '/explore/', { waitUntil: 'domcontentloaded' });
    const card = page.locator('.entry-card').first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole('button', { name: /卷开/ }).click();
    await expect(card.locator('text=出 处')).toBeVisible({ timeout: 15_000 });

    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0]).toMatch(/\/entry-detail\/\d{2}-\d{2}\.json$/);
  });

  test('详情页服务端渲染, 不需要额外请求', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/entry-detail/')) requests.push(r.url());
    });

    await page.goto(BASE + '/book/13-01/', { waitUntil: 'domcontentloaded' });

    // 详情页应直接带全文
    await expect(page.locator('text=出 处')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('text=收 益')).toBeVisible();

    // 不应该再去拉分片
    expect(requests.length).toBe(0);
  });

  test('客户端 bundle 里不再含重字段', async ({ page }) => {
    const scripts: string[] = [];
    page.on('response', async (res) => {
      const url = res.url();
      if (/\/_next\/static\/chunks\/.*\.js$/.test(url)) scripts.push(url);
    });

    await page.goto(BASE + '/explore/', { waitUntil: 'networkidle' });

    // 逐个检查 client chunk 里有没有 benefit/source 的完整数据
    let foundHeavy = false;
    for (const url of scripts) {
      const res = await page.request.get(url);
      const body = await res.text();
      // benefit 字段名 + 较长的文本 = 数据被打包进来了
      if (body.includes('"benefit":"') && body.length > 200_000) {
        foundHeavy = true;
        console.log('   重数据 chunk:', url, Math.round(body.length / 1024) + 'KB');
      }
    }
    expect(foundHeavy).toBe(false);
  });
});
