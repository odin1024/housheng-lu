// 审计: 响应式横向溢出 / 重叠 / 截断 — 只读
import { test } from '@playwright/test';
import { BASE, AUDIT_PAGES } from './audit-pages';

test.use({ trace: 'off', screenshot: 'off' });

const WIDTHS = [
  [320, 'iPhone SE1'],
  [375, 'iPhone SE2/8'],
  [390, 'iPhone 14'],
  [768, 'iPad 竖'],
  [1024, 'iPad 横'],
  [1280, '桌面'],
  [1920, '宽屏'],
] as Array<[number, string]>;

const OVERFLOW_JS = `(() => {
  const vw = window.innerWidth;
  const docW = document.documentElement.scrollWidth;
  const bodyW = document.body.scrollWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1) continue;
    const overRight = r.right - vw;
    const overLeft = -r.left;
    if (overRight > 1 || overLeft > 1) {
      let scrollAncestor = null;
      let n = el.parentElement;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if ((s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowX === 'hidden') && n.scrollWidth > n.clientWidth + 1) {
          scrollAncestor = n.tagName.toLowerCase() + '.' + (n.getAttribute('class') || '').split(/\\s+/).slice(0,2).join('.');
          break;
        }
        n = n.parentElement;
      }
      const cls = (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).slice(0, 2).join('.');
      offenders.push({
        tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : ''),
        right: Math.round(r.right), w: Math.round(r.width),
        overRight: Math.round(overRight),
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 22),
        inScroller: scrollAncestor,
      });
    }
  }
  // 文字被裁: 元素有 overflow hidden/clip + scrollWidth 超出 clientWidth
  const clipped = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    const clips = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis';
    if (!clips) continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      let hasOwnText = false;
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasOwnText = true;
      if (!hasOwnText) continue;
      const cls = (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).slice(0, 2).join('.');
      clipped.push({
        tag: el.tagName.toLowerCase() + '.' + cls,
        clientW: el.clientWidth, scrollW: el.scrollWidth,
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 26),
      });
    }
  }
  const dedup = [];
  const seen = new Set();
  for (const o of offenders.sort((a, b) => b.overRight - a.overRight)) {
    const k = o.tag + o.right;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(o);
  }
  // 表格 / 长内容容器
  const tables = [...document.querySelectorAll('table')].map((t) => ({
    scrollW: t.scrollWidth, clientW: t.clientWidth,
    parentOverflowX: getComputedStyle(t.parentElement).overflowX,
  }));
  const canvas = [...document.querySelectorAll('canvas')].map((c) => ({
    w: Math.round(c.getBoundingClientRect().width), sw: c.scrollWidth,
  }));
  return { vw, docW, bodyW, offenders: dedup.slice(0, 12), total: offenders.length, clipped: clipped.slice(0, 12), tables, canvas };
})()`;

for (const [w, label] of WIDTHS) {
  test(`RWD 溢出 ${w}px ${label}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 844 });
    const lines: string[] = [];
    let worst = 0;
    for (const [path, plabel] of AUDIT_PAGES) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);
      const r: any = await page.evaluate(OVERFLOW_JS);
      const delta = Math.max(r.docW, r.bodyW) - r.vw;
      worst = Math.max(worst, delta);
      const pageOnly = r.offenders.filter((o: any) => !o.inScroller);
      const clippedOnly = r.clipped.filter((c: any) => c.scrollW - c.clientW > 2);
      const problems: string[] = [];
      if (delta > 0) problems.push(`页面横向溢出 ${delta}px (scrollWidth=${Math.max(r.docW, r.bodyW)})`);
      if (pageOnly.length) problems.push(`视口外元素 ${pageOnly.length} 个 (非滚动容器内)`);
      if (clippedOnly.length) problems.push(`文字截断 ${clippedOnly.length} 处`);
      for (const t of r.tables) if (t.scrollW > t.clientW + 1) problems.push(`表格溢出 ${t.scrollW}>${t.clientW} (父 overflow-x=${t.parentOverflowX})`);
      if (problems.length) {
        lines.push(`  ${plabel} ${path} :: ${problems.join(' | ')}`);
        for (const o of r.offenders.slice(0, 4)) {
          lines.push(`     越界 right=${o.right} over=${o.overRight} w=${o.w} scroller=${o.inScroller || '无'} "${o.text}" ${o.tag}`);
        }
        for (const c of clippedOnly.slice(0, 4)) {
          lines.push(`     截断 clientW=${c.clientW} scrollW=${c.scrollW} "${c.text}" ${c.tag}`);
        }
      }
    }
    console.log(`\n### RWD ${w}px ${label} | 最大页面溢出 ${worst}px | 问题页 ${lines.length ? '有' : '无'}`);
    if (!lines.length) console.log('  ALL CLEAR: 9 个页面均无页面级横向溢出 / 无文字截断 / 无表格溢出');
    else for (const l of lines) console.log(l);
    const canvasPages = await page.evaluate(() => [...document.querySelectorAll('canvas')].length);
    console.log(`  (canvas 元素数 ${canvasPages})`);
  });
}
