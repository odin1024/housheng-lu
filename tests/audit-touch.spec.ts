// 审计: 触控目标尺寸 (390x844) — 只读
import { test } from '@playwright/test';
import { BASE, AUDIT_PAGES } from './audit-pages';

const TOUCH_JS = `(() => {
  const SEL = 'a[href], button, [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="option"], [role="switch"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), label[for]';
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll(SEL)) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    const cls = (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).slice(0, 2).join('.');
    const tag = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
    const txt = (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 20);
    const key = tag + '|' + Math.round(r.width) + 'x' + Math.round(r.height) + '|' + txt;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      tag, txt,
      w: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.x), y: Math.round(r.y),
      disabled: el.hasAttribute('disabled'),
      min: Math.min(r.width, r.height),
    });
  }
  return out;
})()`;

test('触控目标 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, label] of AUDIT_PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const rows: any[] = await page.evaluate(TOUCH_JS);
    const small = rows.filter((r) => r.w < 44 || r.h < 44);
    const tiny = rows.filter((r) => r.w < 24 || r.h < 24);
    console.log(
      `\n### 触控 ${label} ${path} | 可点元素 ${rows.length} | <44px ${small.length} | <24px ${tiny.length}`,
    );
    for (const s of small.sort((a, b) => a.min - b.min)) {
      console.log(`  ${String(s.w + 'x' + s.h).padEnd(10)} x=${String(s.x).padEnd(5)} y=${String(s.y).padEnd(6)} "${s.txt}" ${s.tag}${s.disabled ? ' [disabled]' : ''}`);
    }
  }
});
