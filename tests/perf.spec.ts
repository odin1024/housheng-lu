// 用 Playwright + Chrome DevTools Protocol 测量真实 Core Web Vitals
import { test, chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

interface Metrics {
  fcp: number;
  lcp: number;
  cls: number;
  domContentLoaded: number;
  load: number;
  tti: number;
  resourceCount: number;
  totalTransfer: number;
}

// 注意: Playwright 没有 test(title, {timeout}, body) 这种签名,
// 单测超时要在 body 里用 test.setTimeout() (此前这个文件因此从来跑不起来)
test('Core Web Vitals 真实测量', async () => {
  test.setTimeout(60000);
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const urls = [
    { path: '/', name: '首页' },
    { path: '/explore', name: '检索器' },
    { path: '/book/01-01', name: '单节' },
    { path: '/emergency/心脏骤停', name: '急救' },
    { path: '/about', name: '关于' },
  ];

  console.log('\n========== Core Web Vitals (实测) ==========');
  console.log('页面          状态  资源数  传输    DCL     load    FCP    LCP    CLS   TTI');

  for (const u of urls) {
    // 用 PerformanceObserver 监听 LCP
    await page.goto(BASE + u.path, { waitUntil: 'load' });
    // 等 LCP 稳定
    await page.waitForTimeout(1500);

    const metrics = await page.evaluate(() => {
      return new Promise<Metrics>((resolve) => {
        let lcp = 0;
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1] as any;
          if (last) lcp = last.startTime;
        });
        try { obs.observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}

        setTimeout(() => {
          obs.disconnect();
          const paint = performance.getEntriesByType('paint');
          const fcp = paint.find((p: any) => p.name === 'first-contentful-paint')?.startTime || 0;
          const nav = performance.getEntriesByType('navigation')[0] as any;
          const resources = performance.getEntriesByType('resource');
          const totalTransfer = resources.reduce((s: number, r: any) => s + (r.transferSize || r.encodedBodySize || 0), 0);
          let cls = 0;
          try {
            const ls = performance.getEntriesByType('layout-shift') as any[];
            ls.forEach((e: any) => { if (!e.hadRecentInput) cls += e.value; });
          } catch {}
          const tti = nav?.domInteractive ? Math.round(nav.domInteractive) : 0;
          resolve({
            fcp: Math.round(fcp),
            lcp: Math.round(lcp),
            cls: Math.round(cls * 1000) / 1000,
            domContentLoaded: nav?.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : 0,
            load: nav?.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
            tti,
            resourceCount: resources.length,
            totalTransfer,
          });
        }, 500);
      });
    });

    const t = metrics.totalTransfer;
    const transferStr = t > 1024 ? (t / 1024).toFixed(1) + 'KB' : t + 'B';
    // 评级: LCP < 2500 绿, < 4000 黄; CLS < 0.1 绿, < 0.25 黄; FCP < 1800 绿
    const lcpColor = metrics.lcp < 2500 ? '✓' : metrics.lcp < 4000 ? '!' : '✗';
    const clsColor = metrics.cls < 0.1 ? '✓' : metrics.cls < 0.25 ? '!' : '✗';
    console.log(
      `${u.name.padEnd(8)}  200  ${String(metrics.resourceCount).padEnd(6)}  ${transferStr.padEnd(8)}  ${metrics.domContentLoaded}ms  ${metrics.load}ms  ${metrics.fcp}ms  ${lcpColor}${metrics.lcp}ms  ${clsColor}${metrics.cls}  ${metrics.tti}ms`
    );
  }

  await browser.close();
});
