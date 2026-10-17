// 审计: 海报截断 title 兜底 与 侧栏触屏兜底 复核 — 只读
import { test } from '@playwright/test';
import { BASE } from './audit-pages';

test.use({ trace: 'off', screenshot: 'off' });

test('海报截断兜底复核', async ({ page }) => {
  for (const w of [320, 390, 768]) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.goto(BASE + '/poster', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const r: any = await page.evaluate(() => {
      const rows: any[] = [];
      for (const sp of document.querySelectorAll('.max-h-64 span.truncate')) {
        if (sp.scrollWidth <= sp.clientWidth + 1) continue;
        rows.push({
          text: (sp.textContent || '').slice(0, 18),
          spanTitle: sp.getAttribute('title') ? '有' : '无',
          btnTitle: sp.closest('button')?.getAttribute('title') ? '有' : '无',
          srFullText: (sp.textContent || '').length > 0,
        });
      }
      return {
        n: rows.length,
        withTitle: rows.filter((x) => x.spanTitle === '有' || x.btnTitle === '有').length,
        sample: rows.slice(0, 2),
      };
    });
    console.log(`\n[海报 @${w}px] 截断 ${r.n} 处, 有 title 兜底 ${r.withTitle} 处`);
    for (const s of r.sample) console.log(`   "${s.text}" span.title=${s.spanTitle} button.title=${s.btnTitle}`);
  }
});

test('侧栏触屏兜底复核 @768 (iPad 触屏)', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const r: any = await page.evaluate(() => {
    const out: any[] = [];
    for (const sp of document.querySelectorAll('aside span.truncate')) {
      if (sp.scrollWidth <= sp.clientWidth + 1) continue;
      const lab = sp.closest('label');
      const inp = lab?.querySelector('input');
      out.push({
        shown: (sp.textContent || '').slice(0, 24),
        full: sp.getAttribute('title') || lab?.getAttribute('title') || null,
        inputAria: inp?.getAttribute('aria-label'),
        inputAriaLabelledby: inp?.getAttribute('aria-labelledby'),
        // 触屏唯一可能触达完整文本的方式: 长按选中? title 不会显示
        reachableOnTouch: false,
      });
    }
    return { n: out.length, sample: out.slice(0, 2), labelCount: document.querySelectorAll('aside label').length };
  });
  console.log(`\n[侧栏 @768 触屏] 截断 ${r.n} 处 / label 总数 ${r.labelCount}`);
  for (const s of r.sample) {
    console.log(`   显示"${s.shown}…"  完整文本只存在于 title="${s.full}"`);
    console.log(`     input aria-label=${s.inputAria ?? 'null'} aria-labelledby=${s.inputAriaLabelledby ?? 'null'}`);
  }
  console.log('   结论: title 仅鼠标悬停可见; 触屏 (无 hover) 无法读到完整章节名; 屏幕阅读器可读到完整文本(来自 wrapping <label>)');
});
