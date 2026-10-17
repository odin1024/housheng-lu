/**
 * 临时审计 spec #4 (audit- 前缀, 只读): 在当前干净构建上复测
 *  - 首页关键路径 vs 预取
 *  - SW 离线/预缓存真实状态 (干净 profile)
 *  - /api/ask 新防护 (限流 / 体积上限 / 超时)
 *  - 静态资源缓存头
 */
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, 'audit-perf-out');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
function dump(n: string, d: unknown) {
  fs.writeFileSync(path.join(OUT, n), JSON.stringify(d, null, 2), 'utf8');
}
test.use({ trace: 'off', screenshot: 'off' });

test('A. home: critical path vs prefetch (current build)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  const loadAt = await page.evaluate(
    () =>
      new Promise<number>((res) => {
        if (document.readyState === 'complete') return res(performance.now());
        window.addEventListener('load', () => res(performance.now()));
      }),
  );
  await page.waitForTimeout(5000);
  const tl = await page.evaluate((loadAtMs) => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const es = res.map((r) => ({
      p: r.name.replace(location.origin, ''),
      type: r.initiatorType,
      start: Math.round(r.startTime),
      end: Math.round(r.responseEnd),
      transfer: r.transferSize,
      decoded: r.decodedBodySize,
      beforeLoad: r.responseEnd <= loadAtMs,
    }));
    return {
      loadAt: Math.round(loadAtMs),
      ttfb: Math.round(nav.responseStart),
      fcp: performance.getEntriesByType('paint').map((p) => ({ n: p.name, t: Math.round(p.startTime) })),
      count: es.length,
      entries: es.sort((a, b) => a.start - b.start),
      beforeLoadKB: +(es.filter((e) => e.beforeLoad).reduce((s, e) => s + e.transfer, 0) / 1024).toFixed(1),
      afterLoadKB: +(es.filter((e) => !e.beforeLoad).reduce((s, e) => s + e.transfer, 0) / 1024).toFixed(1),
      jsAfterLoad: es.filter((e) => !e.beforeLoad && /\.js/.test(e.p)).map((e) => ({ p: e.p, KB: +(e.transfer / 1024).toFixed(1), start: e.start })),
      rscPrefetch: es.filter((e) => e.p.includes('_rsc=')).length,
      domNodes: document.getElementsByTagName('*').length,
      svg: document.querySelectorAll('svg').length,
      svgDesc: document.querySelectorAll('svg *').length,
      htmlBytes: document.documentElement.outerHTML.length,
    };
  }, loadAt);
  dump('B-home-timeline.json', tl);
  console.log('[A] loadAt=' + tl.loadAt + 'ms ttfb=' + tl.ttfb + 'ms fcp=' + JSON.stringify(tl.fcp));
  console.log('[A] before-load=' + tl.beforeLoadKB + 'KB ; after-load=' + tl.afterLoadKB + 'KB ; rscPrefetchReqs=' + tl.rscPrefetch);
  console.log('[A] JS after load: ' + JSON.stringify(tl.jsAfterLoad));
  console.log('[A] DOM nodes=' + tl.domNodes + ' svg=' + tl.svg + ' svgDescendants=' + tl.svgDesc + ' outerHTML=' + tl.htmlBytes);
  for (const e of tl.entries) console.log(`   [${e.beforeLoad ? 'pre ' : 'post'}] t=${e.start}..${e.end} ${e.type} ${(e.transfer / 1024).toFixed(1)}KB ${e.p.slice(0, 90)}`);
});

test('B. service worker: fresh-profile precache + offline matrix', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const pageLogs: string[] = [];
  page.on('console', (m) => pageLogs.push(m.type() + ' ' + m.text().slice(0, 200)));
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  const afterFirst = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const names = await caches.keys();
    const detail: Record<string, string[]> = {};
    for (const n of names) {
      const c = await caches.open(n);
      detail[n] = (await c.keys()).map((k) => new URL(k.url).pathname);
    }
    return {
      active: reg?.active?.state ?? null,
      controlled: !!navigator.serviceWorker.controller,
      cacheNames: names,
      detail,
    };
  });
  console.log('[B] after first visit: active=' + afterFirst.active + ' controlled=' + afterFirst.controlled);
  console.log('[B] cacheNames=' + JSON.stringify(afterFirst.cacheNames));
  console.log('[B] housheng-lu-v7 (precache) entries=' + JSON.stringify((afterFirst.detail['housheng-lu-v7'] || []).length) + ' -> ' + JSON.stringify(afterFirst.detail['housheng-lu-v7'] || []));
  console.log('[B] runtime entries=' + JSON.stringify((afterFirst.detail['housheng-lu-runtime-v7'] || []).length));

  // 再访问 emergency / book 以写入 runtime cache
  await page.goto('/emergency', { waitUntil: 'networkidle' });
  await page.goto('/book/01-01', { waitUntil: 'networkidle' });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const beforeOffline = await page.evaluate(async () => {
    const names = await caches.keys();
    const detail: Record<string, string[]> = {};
    for (const n of names) {
      const c = await caches.open(n);
      detail[n] = (await c.keys()).map((k) => new URL(k.url).pathname);
    }
    const offlineMatch = await caches.match('/offline.html');
    return { names, detail, hasOffline: !!offlineMatch, runtimeCount: (detail[names[0]] || []).length };
  });
  console.log('[B] before offline: cacheNames=' + JSON.stringify(beforeOffline.names) + ' hasOfflineInAnyCache=' + beforeOffline.hasOffline);

  await ctx.setOffline(true);
  const rows: any[] = [];
  for (const t of ['/', '/emergency', '/book/01-01', '/explore', '/ask']) {
    const row: any = { target: t };
    try {
      const r = await page.goto(t, { waitUntil: 'domcontentloaded', timeout: 12000 });
      row.status = r?.status();
      row.title = await page.title();
      row.body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 90);
    } catch (e: any) {
      row.error = String(e.message).split('\n')[0];
    }
    rows.push(row);
    console.log('[B] OFFLINE ' + JSON.stringify(row));
  }
  dump('B-offline.json', { afterFirst, beforeOffline, rows, pageLogs });
  await page.close();
  await ctx.close();
});

test('C. /api/ask protections (current build)', async ({ request }) => {
  const out: any = {};
  out.health = { status: (await request.get('/api/ask')).status(), body: await (await request.get('/api/ask')).json().catch(() => null) };
  const t0 = Date.now();
  const r = await request.post('/api/ask', { data: { question: '心脏骤停怎么办' } });
  const body = await r.json().catch(() => null);
  out.ask = { status: r.status(), ms: Date.now() - t0, model: body?.model, fallback: body?.fallback, citations: body?.citations?.length, answerHead: (body?.answer || '').slice(0, 60) };
  // 限流: 连打 15 次
  const codes: number[] = [];
  for (let i = 0; i < 15; i++) {
    const rr = await request.post('/api/ask', { data: { question: '安全带' }, failOnStatusCode: false });
    codes.push(rr.status());
  }
  out.rateLimitCodes = codes;
  out.rateLimitHit = codes.filter((c) => c === 429).length;
  // 体积上限
  const big = await request.post('/api/ask', {
    data: { question: 'x'.repeat(20000) },
    headers: { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
  });
  out.bigBody = { status: big.status(), body: await big.text().then((t) => t.slice(0, 120)) };
  out.empty = (await request.post('/api/ask', { data: { question: '' }, failOnStatusCode: false })).status();
  out.badJson = (await request.post('/api/ask', { data: 'not-json', headers: { 'Content-Type': 'application/json' }, failOnStatusCode: false })).status();
  // GET 健康检查是否泄漏部署信息
  const h = await request.get('/api/ask');
  out.healthBody = await h.json();
  dump('C-api-ask.json', out);
  console.log('[C] ' + JSON.stringify(out, null, 1));
});

test('D. static asset cache headers', async ({ request }) => {
  const out: any = {};
  for (const p of ['/_next/static/chunks/webpack-a8ec645a4e87f1ae.js', '/logo/seal-square.svg', '/favicon.svg', '/sw.js', '/offline.html', '/manifest.json', '/']) {
    const r = await request.get(p);
    out[p] = {
      status: r.status(),
      cacheControl: r.headers()['cache-control'] ?? null,
      contentEncoding: r.headers()['content-encoding'] ?? null,
      csp: (r.headers()['content-security-policy'] ?? '').slice(0, 40),
      vary: r.headers()['vary'] ?? null,
    };
  }
  dump('D-headers.json', out);
  console.log('[D] ' + JSON.stringify(out, null, 1));
});
