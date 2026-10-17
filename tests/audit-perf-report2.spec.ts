/**
 * 临时审计 spec #2: 资源时间线 + 离线行为 + 海报/内存 (audit- 前缀, 只读)
 */
import { test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, 'audit-perf-out');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
function dump(n: string, d: unknown) {
  fs.writeFileSync(path.join(OUT, n), JSON.stringify(d, null, 2), 'utf8');
}

test.use({ trace: 'off', screenshot: 'off' });

test('home resource timeline: critical path vs prefetch', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  // 记录 load 时刻
  const loadAt = await page.evaluate(
    () =>
      new Promise<number>((res) => {
        if (document.readyState === 'complete') return res(performance.now());
        window.addEventListener('load', () => res(performance.now()));
      }),
  );
  await page.waitForTimeout(4000);
  const tl = await page.evaluate((loadAtMs) => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const entries = res.map((r) => ({
      p: r.name.replace(location.origin, ''),
      type: r.initiatorType,
      start: Math.round(r.startTime),
      dur: Math.round(r.duration),
      end: Math.round(r.responseEnd),
      transfer: r.transferSize,
      decoded: r.decodedBodySize,
      beforeLoad: r.responseEnd <= loadAtMs,
      nextRouterPrefetch: (r as any).serverTiming?.length ? (r as any).serverTiming : undefined,
    }));
    return {
      loadAt: Math.round(loadAtMs),
      ttfb: Math.round(nav.responseStart),
      fcp: performance.getEntriesByType('paint').map((p) => ({ n: p.name, t: Math.round(p.startTime) })),
      count: entries.length,
      entries: entries.sort((a, b) => a.start - b.start),
      sumBeforeLoad: entries.filter((e) => e.beforeLoad).reduce((s, e) => s + e.transfer, 0),
      sumAfterLoad: entries.filter((e) => !e.beforeLoad).reduce((s, e) => s + e.transfer, 0),
      bigAfterLoad: entries.filter((e) => !e.beforeLoad && e.transfer > 20000),
      bigBeforeLoad: entries.filter((e) => e.beforeLoad && e.transfer > 20000),
    };
  }, loadAt);
  dump('home-timeline.json', tl);
  console.log('LOAD_AT', tl.loadAt, 'TTFB', tl.ttfb, 'FCP', JSON.stringify(tl.fcp));
  console.log('transfer before load =', Math.round(tl.sumBeforeLoad / 1024), 'KB ; after load =', Math.round(tl.sumAfterLoad / 1024), 'KB');
  console.log('BIG BEFORE LOAD:', JSON.stringify(tl.bigBeforeLoad, null, 1));
  console.log('BIG AFTER LOAD:', JSON.stringify(tl.bigAfterLoad, null, 1));
  console.log('ALL ENTRIES:');
  for (const e of tl.entries) console.log(`  [${e.beforeLoad ? 'pre' : 'post'}] t=${e.start}..${e.end} ${e.type} ${Math.round(e.transfer / 1024)}KB ${e.p.slice(0, 100)}`);
});

test('offline: precache + runtime cache behaviour', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const swReady: any = {};
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  swReady.afterFirstVisit = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const names = await caches.keys();
    const detail: any = {};
    for (const n of names) {
      const c = await caches.open(n);
      const keys = await c.keys();
      detail[n] = keys.map((k) => new URL(k.url).pathname);
    }
    return {
      scope: reg?.scope ?? null,
      active: reg?.active?.state ?? null,
      controlled: !!navigator.serviceWorker.controller,
      caches: detail,
    };
  });
  console.log('CACHES AFTER FIRST VISIT:', JSON.stringify(swReady.afterFirstVisit, null, 1));

  // 访问 emergency + book, 写入 runtime cache
  await page.goto('/emergency', { waitUntil: 'networkidle' });
  await page.goto('/book/01-01', { waitUntil: 'networkidle' });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const cachesBefore = await page.evaluate(async () => {
    const names = await caches.keys();
    const detail: any = {};
    for (const n of names) {
      const c = await caches.open(n);
      const keys = await c.keys();
      detail[n] = keys.map((k) => new URL(k.url).pathname);
    }
    return detail;
  });
  console.log('CACHES BEFORE OFFLINE:', JSON.stringify(cachesBefore, null, 1));
  dump('caches-before-offline.json', { swReady, cachesBefore });

  await ctx.setOffline(true);
  const results: any[] = [];
  for (const target of ['/', '/emergency', '/book/01-01', '/explore', '/ask']) {
    let r: any = { target };
    try {
      const resp = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 12000 });
      r.status = resp ? resp.status() : 'null';
      r.title = await page.title();
      r.body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
    } catch (e: any) {
      r.error = String(e.message).split('\n')[0].slice(0, 160);
    }
    results.push(r);
    console.log('OFFLINE', JSON.stringify(r));
  }
  dump('offline-results2.json', results);
  await page.close();
  await ctx.close();
});

test('offline reload of a book page after SW controls', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/book/13-01', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  const r1 = await page.goto('/book/13-01', { waitUntil: 'domcontentloaded', timeout: 12000 }).then(
    async (resp) => ({ status: resp?.status(), title: await page.title(), body: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 100) }),
    (e) => ({ error: String(e.message).split('\n')[0] }),
  );
  console.log('OFFLINE(controlled) /book/13-01 ->', JSON.stringify({ controlled, r1 }));
  dump('offline-controlled.json', { controlled, r1 });
  await page.close();
  await ctx.close();
});

test('poster canvas regeneration + heap', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 200)));
  page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 200)));
  await page.goto('/poster', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const btn = page.locator('button', { hasText: '生成预览' });
  const found = await btn.count();
  console.log('generate buttons found =', found);
  const steps: any[] = [];
  for (let i = 0; i < 3; i++) {
    await btn.first().click({ timeout: 15000 });
    await page.waitForTimeout(2000);
    const s = await page.evaluate(() => {
      const img = document.querySelector('img[alt^="海报预览"]') as HTMLImageElement | null;
      const c = document.querySelector('canvas') as HTMLCanvasElement | null;
      return {
        srcLen: img?.src?.length ?? 0,
        canvases: document.querySelectorAll('canvas').length,
        canvasW: c?.width, canvasH: c?.height,
        nodes: document.getElementsByTagName('*').length,
        mem: (performance as any).memory ? Math.round(((performance as any).memory.usedJSHeapSize / 1048576) * 10) / 10 : null,
      };
    });
    steps.push(s);
    console.log('POSTER step', i, JSON.stringify(s));
  }
  // 切换模板 3 次, 每次都重绘
  for (const label of ['竖版', '横版', '方形']) {
    await page.locator('button', { hasText: label }).first().click({ timeout: 10000 });
    await page.waitForTimeout(1800);
  }
  const afterTemplates = await page.evaluate(() => ({
    mem: (performance as any).memory ? Math.round(((performance as any).memory.usedJSHeapSize / 1048576) * 10) / 10 : null,
    nodes: document.getElementsByTagName('*').length,
  }));
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  const metrics = (await client.send('Performance.getMetrics')).metrics.filter((m) =>
    ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'JSEventListeners', 'LayoutCount', 'RecalcStyleCount'].includes(m.name),
  );
  console.log('POSTER afterTemplates', JSON.stringify(afterTemplates));
  console.log('POSTER cdp', JSON.stringify(metrics));
  console.log('POSTER console logs', JSON.stringify(logs.slice(0, 20)));
  dump('poster-memory2.json', { steps, afterTemplates, metrics, logs: logs.slice(0, 40) });
});

test('explore search: keystroke cost + node churn', async ({ page }) => {
  await page.goto('/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const input = page.locator('#filter-search');
  await input.click();
  const perKey: any[] = [];
  for (const ch of ['安', '全', '带']) {
    const t0 = Date.now();
    await input.press(ch === '安' ? 'A' : ch); // 用 press 注入不了中文, 改用 fill 逐步
    perKey.push({ ch, ms: Date.now() - t0 });
  }
  // 用 fill 逐字模拟中文输入
  const perFill: any[] = [];
  let acc = '';
  for (const ch of '安全带') {
    acc += ch;
    const t0 = Date.now();
    await input.fill(acc);
    await page.waitForTimeout(0);
    const t = await page.evaluate(() => {
      const t0 = performance.now();
      // 强制同步布局, 估算提交成本
      return document.body.getBoundingClientRect().height;
    });
    perFill.push({ value: acc, ms: Date.now() - t0, bodyH: t });
  }
  const state = await page.evaluate(() => ({
    nodes: document.getElementsByTagName('*').length,
    articles: document.querySelectorAll('article').length,
    header: (document.querySelector('main p') as HTMLElement)?.innerText ?? null,
  }));
  // 空查询 + 展开更多 全部按钮次数
  const expand = page.locator('button', { hasText: '展开更多' });
  console.log('SEARCH perFill', JSON.stringify(perFill), 'state', JSON.stringify(state));
  // 点展开更多 3 次, 测每次渲染耗时
  const clicks: any[] = [];
  for (let i = 0; i < 3; i++) {
    const btn = page.locator('button', { hasText: '展开更多' });
    if ((await btn.count()) === 0) break;
    const t0 = Date.now();
    await btn.first().click();
    await page.waitForTimeout(300);
    clicks.push({ i, ms: Date.now() - t0, articles: await page.locator('article').count() });
  }
  console.log('EXPAND MORE', JSON.stringify(clicks));
  dump('explore-search2.json', { perKey, perFill, state, clicks });
});
