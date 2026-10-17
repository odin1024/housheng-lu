/**
 * 临时审计 spec #5: DOM 规模 / 展开更多 / 定时器 / 海报内存 (只读)
 */
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
const OUT = path.join(__dirname, 'audit-perf-out');
function dump(n: string, d: unknown) { fs.writeFileSync(path.join(OUT, n), JSON.stringify(d, null, 2), 'utf8'); }
test.use({ trace: 'off', screenshot: 'off' });
test.setTimeout(180_000);

test('DOM node counts per route', async ({ page }) => {
  const rows: any[] = [];
  for (const r of ['/', '/explore', '/my', '/ask', '/matrix', '/emergency', '/book/01-01', '/emergency/心脏骤停']) {
    await page.goto(r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const s = await page.evaluate((rr) => ({
      route: rr,
      nodes: document.getElementsByTagName('*').length,
      articles: document.querySelectorAll('article').length,
      svg: document.querySelectorAll('svg').length,
      svgDesc: document.querySelectorAll('svg *').length,
      buttons: document.querySelectorAll('button').length,
      imgs: document.querySelectorAll('img').length,
      bodyH: document.body.scrollHeight,
    }), r);
    rows.push(s);
    console.log('ROUTE ' + JSON.stringify(s));
  }
  dump('E-dom.json', rows);
});

test('explore: expand-all node growth', async ({ page }) => {
  await page.goto('/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const steps: any[] = [];
  const snap = async (label: string) => {
    const s = await page.evaluate((l) => ({
      step: l,
      nodes: document.getElementsByTagName('*').length,
      articles: document.querySelectorAll('article').length,
      buttons: document.querySelectorAll('button').length,
      mem: (performance as any).memory ? +(((performance as any).memory.usedJSHeapSize / 1048576)).toFixed(1) : null,
    }), label);
    steps.push(s);
    console.log('EXPLORE ' + JSON.stringify(s));
  };
  await snap('initial');
  for (let i = 1; i <= 6; i++) {
    const btn = page.locator('button', { hasText: '展开更多' });
    if ((await btn.count()) === 0) { console.log('EXPLORE no more expand button at i=' + i); break; }
    const t0 = Date.now();
    await btn.first().click();
    await page.waitForTimeout(250);
    console.log('EXPLORE expand#' + i + ' took ' + (Date.now() - t0) + 'ms (incl 250ms wait)');
    await snap('after-expand-' + i);
  }
  // 强制全部展开
  const guard = 25;
  for (let i = 0; i < guard; i++) {
    const btn = page.locator('button', { hasText: '展开更多' });
    if ((await btn.count()) === 0) break;
    await btn.first().click();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);
  await snap('fully-expanded');
  dump('E-explore-expand.json', steps);
});

test('poster: canvas mime + payload + heap after repeated regenerate', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 160)));
  await page.goto('/poster', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const steps: any[] = [];
  const btn = page.locator('button', { hasText: '生成预览' }).first();
  for (let i = 0; i < 6; i++) {
    await btn.click({ timeout: 20000 });
    await page.waitForTimeout(2200);
    const s = await page.evaluate(() => {
      const img = document.querySelector('img[alt^="海报预览"]') as HTMLImageElement | null;
      return {
        mime: img?.src?.slice(0, 30) ?? null,
        srcBytes: img?.src?.length ?? 0,
        canvases: document.querySelectorAll('canvas').length,
        nodes: document.getElementsByTagName('*').length,
        mem: (performance as any).memory ? +(((performance as any).memory.usedJSHeapSize / 1048576)).toFixed(1) : null,
      };
    });
    steps.push({ i, ...s });
    console.log('POSTER ' + JSON.stringify({ i, ...s }));
  }
  // 切模板
  for (const l of ['竖版', '横版', '方形']) {
    await page.locator('button', { hasText: l }).first().click({ timeout: 15000 });
    await page.waitForTimeout(2500);
    const s = await page.evaluate(() => ({
      mem: (performance as any).memory ? +(((performance as any).memory.usedJSHeapSize / 1048576)).toFixed(1) : null,
      nodes: document.getElementsByTagName('*').length,
    }));
    console.log('POSTER template=' + l + ' ' + JSON.stringify(s));
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const m = (await cdp.send('Performance.getMetrics')).metrics.filter((x) =>
    ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'JSEventListeners', 'LayoutCount', 'RecalcStyleCount', 'TaskDuration'].includes(x.name),
  );
  console.log('POSTER cdp ' + JSON.stringify(m));
  console.log('POSTER console ' + JSON.stringify(logs.slice(0, 25)));
  dump('E-poster.json', { steps, cdp: m, logs: logs.slice(0, 40) });
});

test('timers / listeners after navigation churn', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await cdp.send('Performance.enable');
  const grab = async (label: string) => {
    const m = (await cdp.send('Performance.getMetrics')).metrics.filter((x) =>
      ['JSEventListeners', 'Nodes', 'JSHeapUsedSize', 'LayoutCount', 'RecalcStyleCount'].includes(x.name),
    );
    const o: any = { label };
    for (const x of m) o[x.name] = Math.round(x.value);
    console.log('CHURN ' + JSON.stringify(o));
    return o;
  };
  const out: any[] = [await grab('home-1')];
  // 反复在 explore 内输入 + 切换页面
  for (let round = 0; round < 4; round++) {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const input = page.locator('#filter-search');
    await input.fill('安全');
    await page.waitForTimeout(300);
    await input.fill('');
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    out.push(await grab('round-' + round));
  }
  dump('E-churn.json', out);
});
