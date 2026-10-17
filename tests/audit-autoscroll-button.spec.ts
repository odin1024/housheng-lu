// 「自动展卷」按钮的可发现性/无障碍回归
// 原来: 78×20px、淡墨色混在一行灰字里(对比度 4.69:1, 是"文字"不是"控件")
// 目标: 高度 ≥ 32、对比度 ≥ 4.5、有 aria-pressed、和刻度尺并排
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

/** 在页面里量按钮的尺寸、配色与对比度 */
async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('[data-testid="scroll-chrome"] button')).find(
      (b) => (b.textContent || '').includes('自动展卷') || (b.textContent || '').includes('暂停展卷'),
    ) as HTMLButtonElement | undefined;
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);

    const parse = (c: string) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = (rgb: number[]) => {
      const c = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (a: number[], b: number[]) => {
      const l1 = lum(a);
      const l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    // 找实际生效的背景 (按钮自身透明时向上找)
    let bg = parse(cs.backgroundColor);
    if (cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent') {
      let el: HTMLElement | null = btn.parentElement;
      while (el && (getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)' || !getComputedStyle(el).backgroundColor)) {
        el = el.parentElement;
      }
      bg = el ? parse(getComputedStyle(el).backgroundColor) : [255, 255, 255];
    }

    return {
      text: (btn.textContent || '').trim(),
      w: Math.round(r.width),
      h: Math.round(r.height),
      color: cs.color,
      bg: `rgb(${bg.join(', ')})`,
      contrast: Number(ratio(parse(cs.color), bg).toFixed(2)),
      fontSize: cs.fontSize,
      ariaPressed: btn.getAttribute('aria-pressed'),
      // 与刻度尺是否同一行 (垂直中心接近)
      sameRowAsTicks: (() => {
        const ticks = document.querySelector('[data-testid="scroll-chrome"] .flex-1');
        if (!ticks) return false;
        const tr = ticks.getBoundingClientRect();
        return Math.abs((tr.top + tr.bottom) / 2 - (r.top + r.bottom) / 2) < 12;
      })(),
    };
  });
}

test('自动展卷按钮: 尺寸/对比度/状态语义达标 (桌面与手机)', async ({ page }) => {
  for (const vp of [
    { width: 1280, height: 900, name: '桌面' },
    { width: 390, height: 844, name: '手机' },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE + '/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const m = await measure(page);
    console.log(`\n【${vp.name} ${vp.width}px】`, JSON.stringify(m));
    expect(m).not.toBeNull();
    expect(m!.text).toContain('自动展卷');
    // 触控目标: 高度必须够 (审计下限 24, 这里要求 ≥32 才算"能发现、好点")
    expect(m!.h, `${vp.name} 按钮高度 ${m!.h}`).toBeGreaterThanOrEqual(32);
    // 文字对比度达 AA
    expect(m!.contrast, `${vp.name} 对比度 ${m!.contrast}`).toBeGreaterThanOrEqual(4.5);
    // 与刻度尺同排 (不再混在下方灰字里)
    expect(m!.sameRowAsTicks).toBe(true);
    // 状态语义
    expect(m!.ariaPressed).toBe('false');

    await page.locator('[data-testid="scroll-chrome"]').screenshot({
      path: `tests/screenshots/out-autoscroll-${vp.width}.png`,
    });

    // 运行中: 反白填充, 状态可见
    await page.locator('[data-testid="scroll-chrome"] button:has-text("自动展卷")').click();
    await page.waitForTimeout(400);
    const running = await measure(page);
    console.log(`   运行中:`, JSON.stringify(running));
    expect(running!.text).toContain('暂停展卷');
    expect(running!.ariaPressed).toBe('true');
    // 运行中应是填充态 (背景不再是透明/近背景色)
    expect(running!.bg).not.toBe(m!.bg);
    await page.locator('[data-testid="scroll-chrome"]').screenshot({
      path: `tests/screenshots/out-autoscroll-running-${vp.width}.png`,
    });
  }
});
