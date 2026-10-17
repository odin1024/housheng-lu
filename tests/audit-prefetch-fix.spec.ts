// 验证: 首页是否还会预取那条 2.4MB 数据块
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('首页 load 后是否还拉大数据块', async ({ page }) => {
  const requests: Array<{ url: string; size: number }> = [];
  page.on('response', async (res) => {
    try {
      const len = Number(res.headers()['content-length'] || 0);
      requests.push({ url: res.url(), size: len });
    } catch {}
  });

  await page.goto(BASE + '/', { waitUntil: 'load' });
  const afterLoad = requests.length;
  const bytesAtLoad = requests.reduce((s, r) => s + r.size, 0);

  await page.waitForTimeout(4000); // 给预取留时间
  const bytesAfter = requests.reduce((s, r) => s + r.size, 0);
  const bigChunk = requests.filter((r) => /762-|202-/.test(r.url));

  console.log(`load 时请求数 ${afterLoad}, 传输 ${(bytesAtLoad / 1024).toFixed(1)} KB`);
  console.log(`load 后共 ${requests.length} 请求, 传输 ${(bytesAfter / 1024).toFixed(1)} KB (增量 ${((bytesAfter - bytesAtLoad) / 1024).toFixed(1)} KB)`);
  console.log(`含 765 条数据的 chunk 请求数: ${bigChunk.length}`);
  bigChunk.slice(0, 3).forEach((r) => console.log('  ' + r.url.split('/').pop()));

  // 断点式断言: 首页不得再预取数据块 (此前 load 后额外拉 966KB, 其中 892KB 就是它)
  expect(bigChunk.length).toBe(0);
});
