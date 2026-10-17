// 审计: 焦点可见性精确复测 (等过渡结束) — 只读
import { test } from '@playwright/test';
import { BASE } from './audit-pages';

test.use({ trace: 'off', screenshot: 'off' });

test('焦点可见性 (等 500ms 过渡结束)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const probe = async (wantA: boolean) => {
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      const hit = await page.evaluate((wa: boolean) => {
        const el = document.activeElement as HTMLElement;
        if (!el?.classList.contains('seal-link')) return false;
        const isA = (el.getAttribute('aria-label') || '').includes('A 级');
        return isA === wa;
      }, wantA);
      if (hit) break;
    }
    await page.waitForTimeout(500); // 等 stroke-width 过渡 (180ms) 结束
    return page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const rect = el?.querySelector('rect') as SVGRectElement | null;
      const cs = el ? getComputedStyle(el) : null;
      return {
        isSeal: el?.classList.contains('seal-link'),
        name: el?.getAttribute('aria-label'),
        focusVisible: el?.matches(':focus-visible'),
        outline: cs ? `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` : null,
        rectStrokeWidth: rect ? getComputedStyle(rect).strokeWidth : null,
        rectStroke: rect ? getComputedStyle(rect).stroke : null,
      };
    });
  };

  const a = await probe(true);
  console.log(`\n[A 级印章] ${JSON.stringify(a)}`);
  const b = await probe(false);
  console.log(`[非 A 印章] ${JSON.stringify(b)}`);

  // 普通交互元素: 确认全局 focus-visible 描边
  await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const samples: string[] = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const r: any = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase() + '.' + (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.'),
        fv: el.matches(':focus-visible'),
        outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16),
      };
    });
    if (!r) break;
    samples.push(`${r.tag} focus-visible=${r.fv} outline=${r.outline} "${r.text}"`);
  }
  console.log('\n[普通交互元素 focus]');
  for (const s of samples) console.log(`  ${s}`);

  // 禁用态对比度实测 (按钮 opacity 0.4)
  await page.goto(BASE + '/ask', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const dis: any = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.hasAttribute('disabled'));
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    const op = parseFloat(cs.opacity);
    const parse = (c: string) => {
      const m = c.match(/[\d.]+/g)!;
      return { r: +m[0], g: +m[1], b: +m[2] };
    };
    const fg = parse(cs.color);
    // 页面底
    const bgc = parse(getComputedStyle(document.body).backgroundColor);
    const blend = (f: any, b: any, a: number) => ({
      r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a),
    });
    const eff = blend(fg, bgc, op);
    const L = (c: any) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const l1 = L(eff), l2 = L(bgc);
    return {
      text: btn.textContent?.trim(),
      color: cs.color, opacity: op,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      effRatio: Number((((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2)),
    };
  });
  console.log(`\n[禁用态实测] ${JSON.stringify(dis)}`);
});
