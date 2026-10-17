// 长卷章节标注: 逐一比对 DOM 与 sections.json (顺序 + 标题 + 口径)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:3000';
const sections = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'sections.json'), 'utf-8'),
) as Array<{ id: number; number: number; title: string; caliber: string }>;

test('长卷章节标注与原书章节一一对应', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.locator('.scroll-pan').scrollIntoViewIfNeeded();

  const rendered = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.scroll-pan [title^="第 "]'));
    return nodes.map((n) => ({
      text: (n.textContent || '').trim(),
      title: n.getAttribute('title') || '',
      left: Math.round(n.getBoundingClientRect().left),
    }));
  });

  console.log(`渲染出的章节标注: ${rendered.length} 个 / sections.json: ${sections.length} 章`);
  expect(rendered.length).toBe(sections.length);

  // 顺序必须与 sections.json 一致, 编号与标题都要对上
  const mismatches: string[] = [];
  sections.forEach((s, i) => {
    const r = rendered[i];
    const num = String(s.number).padStart(2, '0');
    if (!r.text.startsWith(num)) mismatches.push(`#${i} 编号不符: 期望 ${num}, 得到 "${r.text}"`);
    else if (!r.text.includes(s.title)) mismatches.push(`#${i} 标题不符: 期望「${s.title}」, 得到 "${r.text}"`);
    if (!r.title.includes(s.title)) mismatches.push(`#${i} tooltip 缺标题: "${r.title}"`);
  });
  if (mismatches.length) console.log('不符项:', JSON.stringify(mismatches, null, 1));
  expect(mismatches).toEqual([]);

  // x 必须随章节递增 (不再有错位)
  const lefts = rendered.map((r) => r.left);
  const sorted = [...lefts].sort((a, b) => a - b);
  expect(lefts).toEqual(sorted);

  // 抽查: 第01节 应是「不要早死」, 第20节 应是「刚出生的孩子怎么带」, 第25节 应是「人走了以后要办什么」
  const spot = (n: number) => sections.find((s) => s.number === n)!.title;
  console.log('抽查 → 01:', spot(1), '| 20:', spot(20), '| 25:', spot(25));
  expect(rendered[0].text).toContain(spot(1));
  expect(rendered[19].text).toContain(spot(20));
  expect(rendered[24].text).toContain(spot(25));

  await page.screenshot({
    path: 'tests/screenshots/out-scroll-bands-start.png',
    clip: { x: 0, y: 250, width: 1280, height: 300 },
  });

  // 再滚到第 20 节附近看标注
  await page.locator('[data-testid="scroll-chrome"] button[title="第 20 节"]').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({
    path: 'tests/screenshots/out-scroll-bands-mid.png',
    clip: { x: 0, y: 250, width: 1280, height: 300 },
  });
});
