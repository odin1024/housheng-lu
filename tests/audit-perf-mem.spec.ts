/**
 * 临时审计 spec #6: 海报重绘内存 + 全新上下文的事件监听器基线 (只读)
 */
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
const OUT = path.join(__dirname, 'audit-perf-out');
function dump(n: string, d: unknown) { fs.writeFileSync(path.join(OUT, n), JSON.stringify(d, null, 2), 'utf8'); }
test.use({ trace: 'off', screenshot: 'off' });
test.setTimeout(180_000);

test('poster repeated regenerate: data URL size + heap', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto('/poster', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await cdp.send('Performance.enable');
  const grab = async () => {
    const m = (await cdp.send('Performance.getMetrics')).metrics;
    const g = (n: string) => Math.round(m.find((x) => x.name === n)?.value ?? 0);
    const ui = await page.evaluate(() => {
      const img = document.querySelector('img[alt^="海报预览"]') as HTMLImageElement | null;
      return { srcLen: img?.src?.length ?? 0, canvases: document.querySelectorAll('canvas').length, domNodes: document.getElementsByTagName('*').length };
    });
    return { heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(2), nodes: g('Nodes'), listenerCount: g('JSEventListeners'), layouts: g('LayoutCount'), recalc: g('RecalcStyleCount'), ...ui };
  };
  const steps: any[] = [{ label: 'initial', ...(await grab()) }];
  console.log('POSTER ' + JSON.stringify(steps[0]));
  // 按钮文案在首次生成后变为「重新生成」, 所以两者都匹配
  const btn = page.locator('button', { hasText: /生成预览|重新生成/ }).first();
  for (let i = 1; i <= 6; i++) {
    await btn.click({ timeout: 25000 });
    await page.waitForTimeout(2500);
    const g = await grab();
    steps.push({ label: 'regen-' + i, ...g });
    console.log('POSTER regen#' + i + ' ' + JSON.stringify({ ...g, srcKB: +(g.srcLen / 1024).toFixed(1) }));
  }
  for (const l of ['竖版', '横版', '方形']) {
    await page.locator('button', { hasText: l }).first().click({ timeout: 15000 });
    await page.waitForTimeout(3000);
    const g = await grab();
    steps.push({ label: 'template-' + l, ...g });
    console.log('POSTER template ' + l + ' ' + JSON.stringify({ ...g, srcKB: +(g.srcLen / 1024).toFixed(1) }));
  }
  dump('F-poster.json', steps);
  await page.close();
  await ctx.close();
});

test('fresh-context listener baseline: book -> home -> explore', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto('about:blank');
  await cdp.send('Performance.enable');
  const grab = async (label: string) => {
    const m = (await cdp.send('Performance.getMetrics')).metrics;
    const g = (n: string) => Math.round(m.find((x) => x.name === n)?.value ?? 0);
    const o = {
      label,
      listeners: g('JSEventListeners'),
      nodes: g('Nodes'),
      heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(2),
      layouts: g('LayoutCount'),
      recalc: g('RecalcStyleCount'),
      domNodes: await page.evaluate(() => document.getElementsByTagName('*').length).catch(() => -1),
    };
    console.log('FRESH ' + JSON.stringify(o));
    return o;
  };
  const rows: any[] = [];
  rows.push(await grab('about-blank'));
  for (const r of ['/book/01-01', '/explore', '/', '/book/02-02', '/explore', '/', '/my', '/']) {
    await page.goto(r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    rows.push(await grab(r));
  }
  dump('F-listeners.json', rows);
  await page.close();
  await ctx.close();
});

test('explore: 100 keystrokes into filter input — blocking cost', async ({ page }) => {
  await page.goto('/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const input = page.locator('#filter-search');
  await input.click();
  const res = await page.evaluate(async () => {
    const el = document.getElementById('filter-search') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    const marks: number[] = [];
    for (let i = 0; i < 30; i++) {
      const t0 = performance.now();
      setter.call(el, '安'.repeat((i % 3) + 1));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      // 强制同步布局 + 读取结果
      void document.body.offsetHeight;
      marks.push(+(performance.now() - t0).toFixed(2));
    }
    return { marks, max: Math.max(...marks), avg: +(marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2) };
  });
  console.log('KEYSTROKE per-input-commit ms: max=' + res.max + ' avg=' + res.avg + ' all=' + JSON.stringify(res.marks));
  dump('F-keystroke.json', res);
});
