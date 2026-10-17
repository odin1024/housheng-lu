/**
 * 临时审计 spec #3: 探明 SW 预缓存为何不在 (只读测量)
 */
import { test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, 'audit-perf-out');
function dump(n: string, d: unknown) {
  fs.writeFileSync(path.join(OUT, n), JSON.stringify(d, null, 2), 'utf8');
}
test.use({ trace: 'off', screenshot: 'off' });

test('capture service worker console + install/precache diagnostics', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const swLogs: any[] = [];
  const netLogs: string[] = [];
  page.on('console', (m) => swLogs.push({ type: m.type(), text: m.text().slice(0, 300) }));
  page.on('requestfailed', (r) => netLogs.push('FAILED ' + r.url() + ' :: ' + (r.failure()?.errorText ?? '')));
  page.on('websocket', () => {});

  // 用 CDP 抓 Service Worker 目标
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  try {
    await cdp.send('Network.enable');
  } catch {}

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  const state = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const names = await caches.keys();
    return {
      reg: { scope: reg?.scope, installing: !!reg?.installing, waiting: !!reg?.waiting, active: reg?.active?.state, controlled: !!navigator.serviceWorker.controller },
      names,
    };
  });
  console.log('STATE', JSON.stringify(state));
  console.log('PAGE CONSOLE:', JSON.stringify(swLogs, null, 1));
  console.log('NET FAILED:', JSON.stringify(netLogs, null, 1));
  dump('sw-diagnostics.json', { state, swLogs, netLogs });
  await page.close();
  await ctx.close();
});

test('verify each precache URL is individually cacheable by the SW', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const probe = await page.evaluate(async () => {
    const urls = ['/', '/explore', '/emergency', '/about', '/favicon.svg', '/logo/seal-square.svg', '/manifest.json', '/offline.html'];
    const out: any[] = [];
    for (const u of urls) {
      try {
        const res = await fetch(u, { cache: 'no-cache' });
        const clone = res.clone();
        // 模拟 sw.js 的 cache.put 行为
        const probeCache = await caches.open('audit-probe');
        let putOk = false;
        let putErr = '';
        try {
          await probeCache.put(new Request(u), clone);
          putOk = true;
        } catch (e: any) {
          putErr = String(e).slice(0, 200);
        }
        out.push({ u, status: res.status, ok: res.ok, type: res.type, putOk, putErr });
      } catch (e: any) {
        out.push({ u, fetchErr: String(e).slice(0, 200) });
      }
    }
    const keys = await (await caches.open('audit-probe')).keys();
    const names = await caches.keys();
    return { out, probeKeys: keys.map((k) => new URL(k.url).pathname), names };
  });
  console.log('PROBE', JSON.stringify(probe, null, 1));
  dump('sw-probe.json', probe);
  await page.close();
  await ctx.close();
});

test('offline: what exactly fails (request failed reasons)', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const failures: string[] = [];
  const responses: string[] = [];
  page.on('requestfailed', (r) => failures.push(r.url().replace('http://localhost:3000', '') + ' :: ' + (r.failure()?.errorText ?? '')));
  page.on('response', (r) => responses.push(r.status() + ' ' + r.url().replace('http://localhost:3000', '')));
  await ctx.setOffline(true);
  let err = '';
  try {
    const resp = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 12000 });
    console.log('OFFLINE / status', resp?.status());
  } catch (e: any) {
    err = String(e.message).split('\n')[0];
  }
  // 再试一次, 看是否有 offline.html
  await page.waitForTimeout(1200);
  const bodyTxt = await page.locator('body').innerText().catch(() => '');
  console.log('OFFLINE / err=', err, ' body=', JSON.stringify(bodyTxt.slice(0, 120)));
  console.log('FAILURES', JSON.stringify(failures, null, 1));
  console.log('RESPONSES', JSON.stringify(responses.slice(-30), null, 1));
  // 直接测 SW 对 /offline.html 的缓存
  const off = await page.evaluate(async () => {
    const m = await caches.match('/offline.html');
    const keys = await caches.keys();
    return { hasOffline: !!m, keys };
  });
  console.log('SW cache match /offline.html ->', JSON.stringify(off));
  dump('offline-deep.json', { err, failures, responses, off });
  await page.close();
  await ctx.close();
});
