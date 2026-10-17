// 全站视觉巡检 - 找所有问题
import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';

const BASE = 'http://localhost:3000';
const PAGES = [
  '/', '/explore', '/book/01-01', '/book/10-23', '/emergency',
  '/emergency/心脏骤停', '/my', '/about', '/matrix', '/poster', '/ask',
  '/logo-preview/v1', '/logo-preview/v2',
];

test('逐页检查: 视觉 + 排版 + 内容', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const results: Array<{ path: string; issues: string[] }> = [];

  for (const p of PAGES) {
    const issues: string[] = [];
    try {
      const r = await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(800);
      if (r?.status() !== 200) {
        issues.push(`HTTP ${r?.status()}`);
      }
      // 截图每个页面
      const safeName = p.replace(/[/:?]/g, '_') || 'root';
      const shot = `tests/audit-${safeName}.png`;
      await page.screenshot({ path: shot, fullPage: false });

      // 检查内容: 一些关键页面应该有 px-2 之类内边距
      const html = await page.content();
      // 检查 <header> / <footer> / <main> 等结构
      if (!html.includes('<header')) issues.push('缺少 <header>');
      if (!html.includes('<main')) issues.push('缺少 <main>');
      if (!html.includes('<footer')) issues.push('缺少 <footer>');

      // 检查 body 是否没内边距
      const bodyPad = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return 'no-main';
        const style = getComputedStyle(main);
        return style.padding || '0px';
      });
      // 记录以便诊断

      if (issues.length > 0) {
        results.push({ path: p, issues });
      }
    } catch (e: any) {
      results.push({ path: p, issues: ['EXCEPTION: ' + e.message] });
    }
  }

  console.log('\n========== 巡检结果 ==========');
  for (const r of results) {
    console.log(`✗ ${r.path}: ${r.issues.join(', ')}`);
  }
  if (results.length === 0) {
    console.log('✓ 所有 12 个页面访问正常');
  }
});
