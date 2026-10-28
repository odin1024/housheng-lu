// 审计: 触控目标尺寸 (390x844)
//
// 原来只 console.log 不断言(审计里的"假测试")。现在按 WCAG 2.2 AA 的 2.5.8 判定:
//   目标至少 24×24 CSS px。豁免(规范允许的两种, 本项目都实际存在):
//     ① 装饰性/冗余路径: 长卷刻度条位于 aria-hidden 容器内(章节跳转另有入口)
//     ② 正文内联链接: display:inline 的 <a>(如页脚署名里的"《高性价比人生指南》")
//   <44px 仍会打印(移动端建议值), 但不判失败。
import { test, expect } from '@playwright/test';
import { BASE, AUDIT_PAGES } from './audit-pages';

const TOUCH_JS = `(() => {
  const SEL = 'a[href], button, [role="button"], [role="tab"], [role="radio"], [role="checkbox"], [role="option"], [role="switch"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), label[for]';
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll(SEL)) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
    // sr-only(裁剪隐藏)的 label 是给读屏用的, 不是可点目标 —— 跳过
    if (cs.position === 'absolute' && (parseFloat(cs.width) <= 1 || parseFloat(cs.height) <= 1)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;

    // 表单控件的真实目标 = 与之关联的 <label> 的外框 (点 label 也能触发)
    let effW = r.width, effH = r.height;
    const lab = el.closest('label') || (el.id ? document.querySelector('label[for="' + el.id + '"]') : null);
    if (lab && lab !== el) {
      const lr = lab.getBoundingClientRect();
      effW = Math.max(effW, lr.width);
      effH = Math.max(effH, lr.height);
    }

    const cls = (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).slice(0, 2).join('.');
    const tag = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
    const txt = (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 20);
    const key = tag + '|' + Math.round(effW) + 'x' + Math.round(effH) + '|' + txt;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      tag, txt,
      w: Math.round(effW), h: Math.round(effH),
      x: Math.round(r.x), y: Math.round(r.y),
      disabled: el.hasAttribute('disabled'),
      min: Math.min(effW, effH),
      // 豁免判定
      decorative: el.closest('[aria-hidden="true"]') !== null,
      inlineLink: el.tagName === 'A' && cs.display === 'inline',
    });
  }
  return out;
})()`;

test('触控目标 390x844: 无小于 24×24 的可点元素(按 WCAG 2.2 AA)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });

  const offenders: string[] = [];

  for (const [path, label] of AUDIT_PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const rows: any[] = await page.evaluate(TOUCH_JS);
    const small = rows.filter((r) => r.w < 44 || r.h < 44);
    const tiny = rows.filter((r) => r.min < 24);
    const realTiny = tiny.filter((r) => !r.decorative && !r.inlineLink && !r.disabled);

    console.log(
      `\n### 触控 ${label} ${path} | 可点元素 ${rows.length} | <44px ${small.length} | <24px ${tiny.length}` +
        ` (豁免: 装饰 ${tiny.filter((r) => r.decorative).length} / 内联链接 ${tiny.filter((r) => r.inlineLink).length})`,
    );
    for (const s of small.sort((a, b) => a.min - b.min).slice(0, 8)) {
      console.log(
        `  ${String(s.w + 'x' + s.h).padEnd(9)} x=${String(s.x).padEnd(4)} y=${String(s.y).padEnd(6)} "${s.txt}" ${s.tag}` +
          (s.decorative ? ' [装饰]' : '') +
          (s.inlineLink ? ' [内联链接]' : ''),
      );
    }
    for (const r of realTiny) offenders.push(`${label} ${path}: ${r.w}x${r.h} "${r.txt}" ${r.tag}`);
  }

  expect(offenders, `以下可点元素小于 24×24:\n  ${offenders.join('\n  ')}`).toEqual([]);
});
