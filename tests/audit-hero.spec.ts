// 首屏诊断: 分隔线位置 / 标题视觉居中 / 板块边界 / 首屏可见内容
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('首屏几何诊断', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const geo = await page.evaluate(() => {
    const r = (el: Element | null) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const hr = document.querySelector('hr.zhu-si-lan');
    const h1 = document.querySelector('h1');
    const heroInner = document.querySelector('section.bg-bg-alt > div');
    const cs = hr ? getComputedStyle(hr) : null;
    const h1cs = h1 ? getComputedStyle(h1) : null;

    // 标题的"墨迹中心" vs 容器中心: letter-spacing 会在末字后留出额外空隙
    let inkOffset: number | null = null;
    if (h1 && heroInner) {
      const range = document.createRange();
      range.selectNodeContents(h1);
      const tb = range.getBoundingClientRect();
      const cb = heroInner.getBoundingClientRect();
      inkOffset = Math.round(tb.left + tb.width / 2 - (cb.left + cb.width / 2));
    }

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      heroInner: r(heroInner),
      seal: r(document.querySelector('section img')),
      h1: r(h1),
      h1FontSize: h1cs?.fontSize,
      h1LetterSpacing: h1cs?.letterSpacing,
      h1InkCenterOffset: inkOffset,
      rule: r(hr),
      ruleComputed: cs ? { margin: cs.margin, width: cs.width, background: cs.backgroundColor } : null,
      subtitle: r(document.querySelector('section p.text-vermillion')),
      statsRow: r(document.querySelector('section .flex.flex-wrap.justify-center')),
      firstContentBelow: r(document.querySelector('section[aria-label="七百余条生计长卷"]')),
      // 首屏内可点击元素
      heroLinksInFold: Array.from(document.querySelectorAll('main a, main button')).filter((el) => {
        const b = el.getBoundingClientRect();
        return b.top < window.innerHeight && b.bottom > 0;
      }).length,
    };
  });
  console.log(JSON.stringify(geo, null, 1));
});
