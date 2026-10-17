/**
 * 临时性能审计 spec (audit- 前缀, 只读测量, 不改任何源码)
 * 运行: npx playwright test tests/audit-perf-report.spec.ts
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, 'audit-perf-out');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function dump(name: string, data: unknown) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2), 'utf8');
}

const INIT_SCRIPT = `
window.__AUDIT__ = { lcp: null, cls: 0, clsEntries: [], shifts: [], longtasks: [] };
try {
  new PerformanceObserver((list) => {
    const es = list.getEntries();
    const last = es[es.length - 1];
    if (last) window.__AUDIT__.lcp = { startTime: last.startTime, renderTime: last.renderTime, loadTime: last.loadTime, size: last.size, url: last.url, element: last.element ? (last.element.tagName + '.' + (last.element.className||'').toString().slice(0,80)) : null };
  }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch (e) { window.__AUDIT__.lcpErr = String(e); }
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) {
        window.__AUDIT__.cls += e.value;
        window.__AUDIT__.shifts.push({ value: e.value, startTime: e.startTime, sources: (e.sources||[]).map(s => s.node ? (s.node.nodeName||'?') : '?') });
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
} catch (e) { window.__AUDIT__.clsErr = String(e); }
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__AUDIT__.longtasks.push({ start: e.startTime, dur: e.duration });
  }).observe({ type: 'longtask', buffered: true });
} catch (e) { window.__AUDIT__.ltErr = String(e); }
`;

async function collect(page: Page, label: string, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const res = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const byType: Record<string, { count: number; transfer: number; decoded: number }> = {};
    for (const r of resources) {
      const t = r.initiatorType || 'other';
      byType[t] = byType[t] || { count: 0, transfer: 0, decoded: 0 };
      byType[t].count++;
      byType[t].transfer += r.transferSize || 0;
      byType[t].decoded += r.decodedBodySize || 0;
    }
    const jsResources = resources
      .filter((r) => /\.js(\?|$)/.test(r.name))
      .map((r) => ({ name: r.name.replace(location.origin, ''), transfer: r.transferSize, decoded: r.decodedBodySize, dur: Math.round(r.duration) }))
      .sort((a, b) => b.transfer - a.transfer);
    return {
      url: location.pathname,
      timing: nav
        ? {
            redirect: nav.redirectEnd - nav.redirectStart,
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tcp: nav.connectEnd - nav.connectStart,
            tls: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
            request: nav.responseStart - nav.requestStart,
            ttfb: nav.responseStart - nav.startTime,
            responseDownload: nav.responseEnd - nav.responseStart,
            domInteractive: nav.domInteractive,
            domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            domComplete: nav.domComplete,
            loadEvent: nav.loadEventEnd,
            transferSize: nav.transferSize,
            encodedBodySize: nav.encodedBodySize,
            decodedBodySize: nav.decodedBodySize,
          }
        : null,
      paint: paint.map((p) => ({ name: p.name, startTime: Math.round(p.startTime) })),
      audit: (window as any).__AUDIT__,
      dom: {
        totalNodes: document.getElementsByTagName('*').length,
        svg: document.querySelectorAll('svg').length,
        svgInner: document.querySelectorAll('svg *').length,
        path: document.querySelectorAll('path').length,
        rect: document.querySelectorAll('rect').length,
        text: document.querySelectorAll('text').length,
        g: document.querySelectorAll('g').length,
        a: document.querySelectorAll('a').length,
        img: document.querySelectorAll('img').length,
        buttons: document.querySelectorAll('button').length,
      },
      resourceTotals: {
        count: resources.length,
        transfer: resources.reduce((s, r) => s + (r.transferSize || 0), 0),
        decoded: resources.reduce((s, r) => s + (r.decodedBodySize || 0), 0),
      },
      byType,
      jsResources,
      html: { htmlBytes: document.documentElement.outerHTML.length, bodyChildren: document.body.children.length },
    };
  });
  dump(`timing-${label}.json`, res);
  console.log(`\n##### ${label} ${url} #####`);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

test.describe('audit perf report', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(INIT_SCRIPT);
  });

  test('home timing / LCP / CLS / DOM', async ({ page }) => {
    await collect(page, 'home', '/');
  });

  test('explore timing', async ({ page }) => {
    await collect(page, 'explore', '/explore');
  });

  test('book entry timing', async ({ page }) => {
    await collect(page, 'book-01-01', '/book/01-01');
  });

  test('offline behaviour', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const results: any[] = [];

    // 先在线访问一次, 让 SW 安装 + 预缓存
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        scope: reg?.scope ?? null,
        active: reg?.active?.state ?? null,
        controlled: !!navigator.serviceWorker.controller,
      };
    });
    // 触发一次 /emergency 与 /book/01-01 在线访问, 让 network-first 写入 runtime cache
    await page.goto('/emergency', { waitUntil: 'networkidle' });
    await page.goto('/book/01-01', { waitUntil: 'networkidle' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const cacheNames = await page.evaluate(async () => {
      const names = await caches.keys();
      const out: any = {};
      for (const n of names) {
        const c = await caches.open(n);
        const keys = await c.keys();
        out[n] = keys.map((k) => new URL(k.url).pathname);
      }
      return out;
    });
    dump('sw-cache-names.json', cacheNames);

    // 断网
    await ctx.setOffline(true);
    for (const target of ['/', '/emergency', '/book/01-01', '/explore']) {
      let status = 'unknown';
      let title = '';
      let bodyText = '';
      let err = '';
      try {
        const resp = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 15000 });
        status = resp ? String(resp.status()) : 'null-response';
        title = await page.title();
        bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 200).replace(/\s+/g, ' ');
      } catch (e: any) {
        err = String(e.message).slice(0, 300);
      }
      results.push({ target, status, title, bodyText, err });
      console.log(`OFFLINE ${target} -> status=${status} title="${title}" err=${err} body="${bodyText}"`);
    }
    dump('offline-results.json', { swState, cacheNames, results });
    await ctx.close();
  });

  test('source map / static leakage check', async ({ page, request }) => {
    const checks: any = {};
    for (const p of ['/_next/static/chunks/202-15168a2dbc648f9e.js.map', '/_next/static/chunks/202-15168a2dbc648f9e.js']) {
      const r = await request.get(p);
      checks[p] = { status: r.status(), size: (await r.body()).length };
    }
    // 首页 HTML 里是否含条目正文 (证明服务端渲染)
    const homeResp = await request.get('/');
    const html = await homeResp.text();
    checks.homeHtml = {
      bytes: html.length,
      contains01_01: html.includes('01-01'),
      containsTitle_安全带: /安全\s*带/.test(html),
      containsLongScrollSvg: html.includes('<svg'),
      looksLikeRSC: html.includes('self.__next_f.push'),
    };
    dump('leak-check.json', checks);
    console.log(JSON.stringify(checks, null, 2));
  });

  test('search input re-render cost on explore', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const input = page.locator('#filter-search');
    await input.click();
    const t0 = Date.now();
    await input.type('安全', { delay: 60 });
    const typed = Date.now() - t0;
    await page.waitForTimeout(600);
    const cardCount = await page.locator('article').count();
    const info = await page.evaluate(() => ({
      nodes: document.getElementsByTagName('*').length,
      articles: document.querySelectorAll('article').length,
      text: (document.querySelector('p.text-sm.text-ink-soft') as HTMLElement)?.innerText ?? null,
    }));
    console.log('SEARCH typing ms=', typed, JSON.stringify(info));
    dump('explore-search.json', { typed, cardCount, info });

    // 滚动长卷, 测 scroll 处理成本 (rAF/节流与否) —— 用 long task 观察
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      (window as any).__AUDIT_SCROLL__ = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) (window as any).__AUDIT_SCROLL__.push(e.duration);
      }).observe({ type: 'longtask', buffered: false });
    });
    const pan = page.locator('.scroll-pan');
    const box = await pan.boundingBox();
    const scrollStats = await page.evaluate(async () => {
      const el = document.querySelector('.scroll-pan') as HTMLElement;
      const t0 = performance.now();
      let frames = 0;
      for (let i = 0; i < 60; i++) {
        el.scrollLeft = i * 40;
        await new Promise((r) => requestAnimationFrame(r));
        frames++;
      }
      return { ms: performance.now() - t0, frames };
    });
    await page.waitForTimeout(800);
    const lt = await page.evaluate(() => (window as any).__AUDIT_SCROLL__ ?? []);
    console.log('SCROLL programmatic 60 frames ms=', scrollStats.ms, 'longtasks=', JSON.stringify(lt));
    dump('scroll-stats.json', { scrollStats, longtasks: lt, box });
  });

  test('memory: objectURL / canvas / listeners heuristics', async ({ page }) => {
    const info: any = { consoleMessages: [] };
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') info.consoleMessages.push({ type: m.type(), text: m.text().slice(0, 300) });
    });
    await page.goto('/poster', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    // 生成预览若干次, 看 <img src=data:...> 会不会累积
    const gen = page.getByRole('button', { name: /生成预览/ });
    for (let i = 0; i < 3; i++) {
      await gen.click();
      await page.waitForTimeout(1200);
      const dims = await page.evaluate(() => {
        const img = document.querySelector('img[alt^="海报预览"]') as HTMLImageElement | null;
        return { srcLen: img?.src?.length ?? 0, nodes: document.getElementsByTagName('*').length, canvases: document.querySelectorAll('canvas').length };
      });
      info[`gen${i}`] = dims;
      console.log('POSTER gen', i, JSON.stringify({ ...dims, srcLenKB: Math.round(dims.srcLen / 1024) }));
    }
    // heap if available
    const heap = await page.evaluate(() => ({
      // @ts-ignore
      mem: (performance as any).memory ? { used: (performance as any).memory.usedJSHeapSize, total: (performance as any).memory.totalJSHeapSize } : null,
    }));
    info.heap = heap;
    // JS handle / listener count not exposed; report CDP-level metrics
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    const metrics = await client.send('Performance.getMetrics');
    info.cdpMetrics = metrics.metrics.filter((m) =>
      ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'Documents', 'LayoutCount', 'RecalcStyleCount', 'JSEventListeners'].includes(m.name),
    );
    console.log('POSTER heap/cdp', JSON.stringify(info.cdpMetrics));
    dump('poster-memory.json', info);
  });

  test('api/ask fault tolerance', async ({ request }) => {
    const out: any = {};
    const g = await request.get('/api/ask');
    out.health = { status: g.status(), body: await g.json() };

    const t0 = Date.now();
    const p = await request.post('/api/ask', { data: { question: '心脏骤停怎么办' } });
    out.ask = { status: p.status(), ms: Date.now() - t0, body: await p.json() };
    console.log('ASK', JSON.stringify(out.ask).slice(0, 1200));

    out.empty = { status: (await request.post('/api/ask', { data: { question: '' } })).status() };
    out.tooLong = { status: (await request.post('/api/ask', { data: { question: 'x'.repeat(600) } })).status() };
    out.badJson = { status: (await request.post('/api/ask', { data: 'not json', headers: { 'Content-Type': 'application/json' } })).status() };
    dump('api-ask.json', out);
    console.log(JSON.stringify(out, null, 2));
  });

  test('fonts and public assets', async ({ request }) => {
    const out: any = {};
    // 首页 HTML 里引用的字体
    const html = await (await request.get('/')).text();
    out.fontFaces = (html.match(/@font-face/g) || []).length;
    out.woffRefs = Array.from(new Set(html.match(/[^"']*\.woff2?[^"']*/g) || []));
    const css = await (await request.get('/_next/static/css/3b01acd9dc53a0fc.css')).text();
    out.cssBytes = css.length;
    out.cssFontFaces = (css.match(/@font-face/g) || []).length;
    out.cssWoffRefs = Array.from(new Set(css.match(/[^"')\s]*\.woff2?/g) || []));
    out.cssFontSrcSamples = (css.match(/@font-face\{[^}]*\}/g) || []).slice(0, 6);
    dump('fonts.json', out);
    console.log(JSON.stringify(out, null, 2));
  });
});
