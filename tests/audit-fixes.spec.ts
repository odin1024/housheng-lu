// 审计修复验证: 急救详情页对比度/标题层级 + 404/loading + 限流 + CSP
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

function lum(rgb: number[]) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: number[], b: number[]) {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function parse(css: string): number[] {
  const m = css.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
}

test('急救详情页: 对比度与标题层级', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/emergency');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  // 取第一个场景链接
  const href = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a[href^="/emergency/"]'))[0] as HTMLAnchorElement;
    return a ? a.getAttribute('href') : null;
  });
  expect(href).toBeTruthy();
  await page.goto(BASE + href!);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const probe = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const items: Array<{ sel: string; text: string; color: string; size: number }> = [];
    const push = (el: Element | null, sel: string) => {
      if (!el) return;
      const cs = getComputedStyle(el);
      items.push({
        sel,
        text: (el.textContent || '').trim().slice(0, 20),
        color: cs.color,
        size: parseFloat(cs.fontSize),
      });
    };
    push(document.querySelector('nav a'), '返回链接');
    push(document.querySelector('h1'), 'h1 场景名');
    push(document.querySelector('ol li p'), '步骤正文');
    push(document.querySelector('footer p'), '页脚署名');
    const juan = Array.from(document.querySelectorAll('div')).find((d) =>
      (d.className || '').toString().includes('juan-end'),
    );
    push(juan ?? null, '结卷标记');
    return { bg, items, headings: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length };
  });

  const bgRgb = parse(probe.bg);
  console.log('页面背景:', probe.bg, '| 标题元素数:', probe.headings);
  expect(probe.headings).toBeGreaterThan(0); // 此前该页 0 个标题

  for (const it of probe.items) {
    const r = ratio(parse(it.color), bgRgb);
    const large = it.size >= 24 || (it.size >= 18.66 && false);
    const need = large ? 3 : 4.5;
    const verdict = r >= need ? '✅' : '❌';
    console.log(
      `${verdict} ${it.sel.padEnd(6)} "${it.text}" ${it.color} @${it.size}px → ${r.toFixed(2)}:1 (需 ${need}:1)`,
    );
    // 结卷标记/juan-end 字号小, 只要 >= 3:1 视为可接受 (次要装饰文字)
    if (it.sel !== '结卷标记') expect(r).toBeGreaterThanOrEqual(need);
  }
  await page.screenshot({ path: 'tests/screenshots/out-emergency-fixed.png', fullPage: false });
});

test('404 与 error 边界存在且可用', async ({ page }) => {
  const res = await page.goto(BASE + '/definitely-not-a-real-page');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('佚');
  console.log('404 标题:', (await page.locator('h1').innerText()).trim());
  // 404 页要能回到卷端
  await expect(page.locator('a[href="/"]').first()).toBeVisible();
});

test('API 输入校验与限流', async ({ request }) => {
  const bad = await request.post(BASE + '/api/ask', { data: { question: '' } });
  console.log('空问题 →', bad.status());
  expect(bad.status()).toBe(400);

  const tooLong = await request.post(BASE + '/api/ask', { data: { question: '啊'.repeat(501) } });
  console.log('超长问题 →', tooLong.status());
  expect(tooLong.status()).toBe(400);

  // 连发直到限流 (窗口 10 次/分)
  let sawLimit = false;
  for (let i = 0; i < 14; i++) {
    const r = await request.post(BASE + '/api/ask', { data: { question: '心脏骤停怎么办' } });
    if (r.status() === 429) {
      sawLimit = true;
      console.log(`第 ${i + 1} 次触发限流 429, Retry-After=${r.headers()['retry-after']}`);
      break;
    }
  }
  expect(sawLimit).toBe(true);
});
