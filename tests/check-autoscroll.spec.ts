// 自动展卷: 客观测量点击后 scrollLeft 是否真的在推进, 以及末尾行为
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
const CHROME = '[data-testid="scroll-chrome"]';

test('自动展卷是否真的在滚', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);

  const pan = page.locator('.scroll-pan');
  await pan.scrollIntoViewIfNeeded();
  await page.mouse.move(20, 20); // 移开滚动区, 避免触发 hover 暂停
  await page.waitForTimeout(200);

  const read = () =>
    page.evaluate(() => Math.round((document.querySelector('.scroll-pan') as HTMLElement).scrollLeft));

  const before = await read();
  await page.locator('button:has-text("自动展卷")').click();
  await page.waitForTimeout(1500);
  const after = await read();

  const cs = await page.evaluate(() => {
    const el = document.querySelector('.scroll-pan') as HTMLElement;
    const s = getComputedStyle(el);
    return { snap: s.scrollSnapType, behavior: s.scrollBehavior };
  });

  console.log(`点击后 1.5s: scrollLeft ${before} → ${after} (Δ=${after - before})`);
  console.log('计算样式:', JSON.stringify(cs));
  // 自动展卷期间必须关掉吸附与平滑, 否则每帧位移会被抵消 (曾实测 Δ=0)
  expect(after).toBeGreaterThan(before);
  expect(cs.snap).toBe('none');
});

test('自动展卷: 悬停暂停 / 暂停后停在节起点', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
  const pan = page.locator('.scroll-pan');
  await pan.scrollIntoViewIfNeeded();
  await page.mouse.move(20, 20);
  await page.locator('button:has-text("自动展卷")').click();
  await page.waitForTimeout(1200);

  // 鼠标移到长卷上 → 应暂停
  const box = (await pan.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  const a = await page.evaluate(() => Math.round((document.querySelector('.scroll-pan') as HTMLElement).scrollLeft));
  await page.waitForTimeout(900);
  const b = await page.evaluate(() => Math.round((document.querySelector('.scroll-pan') as HTMLElement).scrollLeft));
  console.log(`悬停期间: ${a} → ${b} (Δ=${b - a}, 应为 0)`);
  expect(b - a).toBe(0);

  // 移开 + 暂停 → 平滑吸附到最近的节起点
  // 节起点 = 引首留白 120 + 256i; 暂停目标 = 120 - 8 = 112
  await page.mouse.move(20, 20);
  await page.locator('button:has-text("暂停展卷")').click();
  await page.waitForTimeout(1400);
  const final = await page.evaluate(() =>
    Math.round((document.querySelector('.scroll-pan') as HTMLElement).scrollLeft),
  );
  const offset = (final - 112) % 256;
  console.log(`暂停后 scrollLeft=${final}, 距节起点 ${Math.min(offset, 256 - offset)}px`);
  expect(Math.min(offset, 256 - offset)).toBeLessThanOrEqual(12);
});

test('展卷到末尾: 停在卷尾 + 读数到 34 + 一键回卷首', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
  const pan = page.locator('.scroll-pan');
  await pan.scrollIntoViewIfNeeded();

  const state = () =>
    page.evaluate((sel) => {
      const el = document.querySelector('.scroll-pan') as HTMLElement;
      const chrome = document.querySelector(sel) as HTMLElement;
      const m = (chrome.textContent || '').match(/第\s*(\d+)\s*节/);
      return {
        left: Math.round(el.scrollLeft),
        max: el.scrollWidth - el.clientWidth,
        section: m ? Number(m[1]) : null,
        hasEndButton: !!chrome.querySelector('button[title*="回到卷首"]'),
      };
    }, CHROME);

  // 先瞬移到离卷尾 300px 处
  // 注意 1: scrollTo({behavior:'auto'}) 会沿用 CSS 的 scroll-behavior:smooth (不是"瞬间"),
  //         必须临时把内联 scroll-behavior 压成 auto 才能真正瞬移
  // 注意 2: 不能停在进度 ≥98% 的位置 —— 那时按钮已变成「已到卷尾 · 回到卷首」, 就没有自动展卷可点
  await page.evaluate(() => {
    const el = document.querySelector('.scroll-pan') as HTMLElement;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = el.scrollWidth - el.clientWidth - 300;
    el.style.scrollBehavior = prev;
  });
  await page.waitForTimeout(300);
  const start = await state();
  console.log('起点(应接近卷尾):', JSON.stringify(start));
  expect(start.max - start.left).toBeLessThanOrEqual(310);
  expect(start.hasEndButton).toBe(false);
  await page.mouse.move(20, 20);

  await page.locator('button:has-text("自动展卷")').click();
  await page.waitForTimeout(5200); // 300px / 72px·s⁻¹ ≈ 4.2s
  const end = await state();
  console.log('展卷到底:', JSON.stringify(end));
  expect(end.left).toBe(end.max);
  expect(end.section).toBe(34);
  expect(end.hasEndButton).toBe(true);

  // 不应被吸附往回拽
  await page.waitForTimeout(800);
  const still = await state();
  console.log('等待后再测 (防吸附回拽):', JSON.stringify(still));
  expect(still.left).toBe(end.max);

  // 一键回卷首
  await page.locator('button[title*="回到卷首"]').click();
  await page.waitForTimeout(1600);
  const home = await state();
  console.log('点回卷首:', JSON.stringify(home));
  expect(home.left).toBeLessThanOrEqual(80);
  expect(home.section).toBe(1);
});
