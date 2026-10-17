// 审计: 色彩对比度 (WCAG 2.x) — 只读, 不改任何源码
import { test } from '@playwright/test';
import { BASE, AUDIT_PAGES } from './audit-pages';

const CONTRAST_JS = `(() => {
  function parse(c) {
    const m = String(c).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((s) => parseFloat(s.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function over(fg, bg) {
    const a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  }
  function lum(c) {
    const f = (v) => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function ratio(a, b) {
    const l1 = lum(a), l2 = lum(b);
    const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function hex(c) {
    const h = (v) => Math.round(v).toString(16).padStart(2, '0');
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }
  function desc(el) {
    const cls = (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).slice(0, 2).join('.');
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
  }
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };

  // 逐级向上找有效背景 (含自身), 处理半透明叠加
  function effBg(el) {
    let stack = [];
    let n = el;
    let opaque = null;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        stack.push({ c, el: n, img: cs.backgroundImage !== 'none' });
        if (c.a >= 1) { opaque = true; break; }
      }
      n = n.parentElement;
    }
    let base = bodyBg.a >= 1 ? bodyBg : { r: 255, g: 255, b: 255, a: 1 };
    let out = base;
    for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i].c, out);
    return { color: out, layers: stack.length, textured: stack.some((s) => s.img) };
  }
  function opacityChain(el) {
    let o = 1, n = el;
    while (n && n !== document.documentElement) {
      const v = parseFloat(getComputedStyle(n).opacity);
      if (!isNaN(v)) o *= v;
      n = n.parentElement;
    }
    return o;
  }

  const out = [];
  const seen = new Map();
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    if (el.classList.contains('sr-only')) continue;
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    // 只取直接文本
    let txt = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) txt += node.textContent;
    }
    txt = txt.replace(/\\s+/g, ' ').trim();
    if (!txt) continue;
    // 跳过被遮挡/裁剪到 0 的
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;

    const fg0 = parse(cs.color);
    if (!fg0) continue;
    const bg = effBg(el);
    const op = opacityChain(el);
    const fgEff = over({ ...fg0, a: fg0.a * op }, bg.color);
    const cr = ratio(fgEff, bg.color);

    const fs = parseFloat(cs.fontSize);
    const fw = parseInt(cs.fontWeight, 10) || 400;
    const isLarge = fs >= 24 || (fs >= 18.66 && fw >= 700);
    const need = isLarge ? 3 : 4.5;
    const disabled = el.closest('[disabled]') !== null || el.getAttribute('aria-disabled') === 'true';

    const key = [hex(fgEff), hex(bg.color), fs, fw, need, disabled].join('|');
    const rec = {
      sel: desc(el),
      fg: hex(fgEff),
      bg: hex(bg.color),
      opacity: Number(op.toFixed(2)),
      fs, fw, need,
      ratio: Number(cr.toFixed(2)),
      disabled,
      textured: bg.textured,
      text: txt.slice(0, 22),
    };
    if (seen.has(key)) { seen.get(key).count++; continue; }
    seen.set(key, { ...rec, count: 1 });
    out.push({ ...rec, pass: cr >= need });
  }
  return out;
})()`;

for (const [path, label] of AUDIT_PAGES) {
  test(`对比度 ${label} ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const rows: any[] = await page.evaluate(CONTRAST_JS);
    const fails = rows.filter((r) => !r.pass);
    console.log(`\n### 对比度 ${label} ${path} | 样本 ${rows.length} | 不合格 ${fails.length}`);
    const sorted = fails.sort((a, b) => a.ratio - b.ratio);
    for (const f of sorted) {
      console.log(
        `  FAIL ${String(f.ratio).padEnd(6)} <${f.need} fg=${f.fg} bg=${f.bg} alpha=${f.opacity} ${f.fs}px/${f.fw}` +
          `${f.disabled ? ' [disabled]' : ''}${f.textured ? ' [纹理背景]' : ''} x${f.count} "${f.text}" ${f.sel}`,
      );
    }
    // 也打印最低的 6 个及格项, 用于说明边界
    const passing = rows.filter((r) => r.pass).sort((a, b) => a.ratio - b.ratio).slice(0, 6);
    for (const p of passing) {
      console.log(
        `  ok   ${String(p.ratio).padEnd(6)} >=${p.need} fg=${p.fg} bg=${p.bg} ${p.fs}px/${p.fw} x${p.count} "${p.text}" ${p.sel}`,
      );
    }
  });
}
