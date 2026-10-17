// 审计: sticky header 背景/模糊与内容重叠 — 只读
import { test } from '@playwright/test';
import { BASE } from './audit-pages';

test.use({ trace: 'off' });

test('header 背景与重叠', async ({ page }) => {
  for (const [w, h, label] of [
    [1280, 900, '桌面 1280'],
    [390, 844, '手机 390'],
  ] as Array<[number, number, string]>) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const idle: any = await page.evaluate(() => {
      const hd = document.querySelector('header')!;
      const cs = getComputedStyle(hd);
      return {
        bg: cs.backgroundColor,
        bgImage: cs.backgroundImage,
        backdrop: cs.backdropFilter || (cs as any).webkitBackdropFilter,
        cls: hd.className,
        h: Math.round(hd.getBoundingClientRect().height),
      };
    });
    console.log(`\n[${label}] header class="${idle.cls}"`);
    console.log(`  height=${idle.h}px background-color=${idle.bg} backdrop-filter=${idle.backdrop}`);
    console.log(`  background-image=${idle.bgImage.slice(0, 40)}`);

    // 目标: 表格是否穿透到 header 底下
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    const scrolled: any = await page.evaluate(() => {
      const hd = document.querySelector('header')!;
      const hb = hd.getBoundingClientRect();
      // 取 header 覆盖区域内、位于 header 之后的元素
      const cx = Math.round(window.innerWidth / 2);
      const cy = Math.round(hb.bottom - 6);
      const stack = document.elementsFromPoint(cx, cy).map((e) => {
        const cs = getComputedStyle(e);
        return {
          tag: e.tagName.toLowerCase() + '.' + (e.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.'),
          bg: cs.backgroundColor,
          bd: cs.backdropFilter,
          z: cs.zIndex,
        };
      });
      return { stack: stack.slice(0, 5), headerBottom: Math.round(hb.bottom) };
    });
    console.log(`  滚动 600px 后, 在 y=${scrolled.headerBottom - 6} (header 覆盖区内) 的层叠 (自上而下):`);
    for (const s of scrolled.stack) console.log(`     ${s.tag} bg=${s.bg} backdrop=${s.bd} z=${s.z}`);
    const shot = `tests/screenshots/audit-header-overlap-${w}.png`;
    await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: w, height: 220 } });
    console.log(`  截图: ${shot}`);
  }
});
