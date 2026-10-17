// 逐个页面截"底部一屏", 再拼成一张总览图, 用来看全站收尾是否协调
import { test } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:3000';
const PAGES: Array<[string, string]> = [
  ['home', '/'],
  ['explore', '/explore'],
  ['book', '/book/10-23'],
  ['ask', '/ask'],
  ['emergency', '/emergency'],
  ['matrix', '/matrix'],
  ['poster', '/poster'],
  ['my', '/my'],
  ['about', '/about'],
];

test('底部总览', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 620 });
  const files: string[] = [];
  for (const [slug, path] of PAGES) {
    await page.goto(BASE + path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const f = `tests/screenshots/bottom-${slug}.png`;
    await page.screenshot({ path: f });
    files.push(f);
    // 统计每页底部元素: 印章图数量 + 是否有结卷标记
    const info = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[src*="seal-end"]'));
      const footer = document.querySelector('footer');
      return {
        sealImgs: imgs.length,
        footerSeal: footer ? footer.querySelectorAll('img[src*="seal-end"]').length : 0,
        hasJuanEnd: !!document.querySelector('.juan-end'),
      };
    });
    console.log(`${path} → 印章图 ${info.sealImgs} (页脚 ${info.footerSeal}) · 结卷标记 ${info.hasJuanEnd}`);
  }

  // 拼成 3x3 总览
  const cells = files
    .map((f, i) => {
      const b64 = fs.readFileSync(f).toString('base64');
      return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${PAGES[i][1]}</figcaption></figure>`;
    })
    .join('');
  await page.setContent(
    `<style>
      body{margin:0;background:#222;font:12px/1.4 sans-serif;color:#eee;
           display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px}
      figure{margin:0}
      img{width:100%;display:block;border:1px solid #555}
      figcaption{padding:3px 0;text-align:center}
    </style>${cells}`,
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/bottom-all.png', fullPage: true });
  console.log('总览图: tests/screenshots/bottom-all.png');
});
