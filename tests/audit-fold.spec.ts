// 诊断: 首屏底部的横线是什么 / 板块顺序 / 长卷内部留白
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('首屏横线与板块结构', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const vh = window.innerHeight;
    // main 下各板块: 标签名 / 背景 / 上下边框 / 位置
    const sections = Array.from(document.querySelectorAll('main > section, main > div > section')).map((el) => {
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return {
        label: (el.getAttribute('aria-label') || el.className.toString().slice(0, 40)).trim(),
        bg: cs.backgroundColor,
        borderTop: cs.borderTopWidth + ' ' + cs.borderTopColor,
        borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomColor,
        top: Math.round(b.top),
        bottom: Math.round(b.bottom),
        h: Math.round(b.height),
      };
    });

    // 折叠线附近 (视口底部 ±40px) 命中的水平线元素
    const nearFold: string[] = [];
    document.querySelectorAll('main *').forEach((el) => {
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      const isLine =
        b.height <= 2 &&
        b.width > 200 &&
        (parseFloat(cs.borderTopWidth) > 0 || cs.backgroundColor !== 'rgba(0, 0, 0, 0)');
      if (isLine && b.top > vh - 60 && b.top < vh + 20) {
        nearFold.push(
          `${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 30)} @y=${Math.round(b.top)} w=${Math.round(b.width)} bt=${cs.borderTopWidth}/${cs.borderTopColor} bg=${cs.backgroundColor}`,
        );
      }
    });

    // 长卷 SVG 内部: 印章与文字的实际 y 区间 (看留白)
    const scrollSection = document.querySelector('section[aria-label="七百余条生计长卷"]')!;
    const svg = scrollSection.querySelector('svg')!;
    const svgBox = svg.getBoundingClientRect();
    const sealBoxes = Array.from(scrollSection.querySelectorAll('.seal-link rect')).slice(0, 4).map((r) => {
      const b = r.getBoundingClientRect();
      return { top: Math.round(b.top - svgBox.top), bottom: Math.round(b.bottom - svgBox.top) };
    });
    const texts = Array.from(scrollSection.querySelectorAll('svg text')).slice(0, 12).map((t) => {
      const b = t.getBoundingClientRect();
      return { txt: (t.textContent || '').slice(0, 10), top: Math.round(b.top - svgBox.top) };
    });

    return {
      viewportH: vh,
      sections,
      nearFold,
      svgHeight: Math.round(svgBox.height),
      sealSpanInSvg: sealBoxes,
      textTopsInSvg: texts,
    };
  });
  console.log(JSON.stringify(info, null, 1));
});
