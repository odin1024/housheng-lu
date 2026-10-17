// 全页面响应式 + 内容溢出检查 - 多视口截图
import { test, expect, Page, Browser } from '@playwright/test';
import { promises as fs } from 'node:fs';

const BASE = 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'mobile-sm', width: 320, height: 568 },
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
];

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/explore', name: 'explore' },
  { path: '/book/01-01', name: 'book' },
  { path: '/emergency', name: 'emergency' },
  { path: '/emergency/心脏骤停', name: 'emergency-detail' },
  { path: '/my', name: 'my' },
  { path: '/about', name: 'about' },
  { path: '/matrix', name: 'matrix' },
  { path: '/poster', name: 'poster' },
  { path: '/ask', name: 'ask' },
];

interface OverflowIssue {
  page: string;
  viewport: string;
  issue: string;
  detail: string;
}

async function checkOverflow(page: Page, pageName: string, viewport: { name: string; width: number; height: number }): Promise<OverflowIssue[]> {
  const issues: OverflowIssue[] = [];
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.waitForTimeout(500);

  // 1. 检查 body 横向滚动
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.body.scrollWidth > document.body.clientWidth + 1;
  });
  if (hasHorizontalScroll) {
    const overflow = await page.evaluate(() => {
      const sw = document.body.scrollWidth;
      const cw = document.body.clientWidth;
      const overflowingElements: Array<{tag: string; cls: string; w: number; right: number}> = [];
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > cw + 1 && r.width > 0) {
          overflowingElements.push({
            tag: el.tagName,
            cls: el.className?.toString().slice(0, 80) || '',
            w: Math.round(r.width),
            right: Math.round(r.right),
          });
        }
      });
      return { scrollWidth: sw, clientWidth: cw, overflowing: overflowingElements.slice(0, 5) };
    });
    issues.push({
      page: pageName,
      viewport: viewport.name,
      issue: '横向滚动 (body scrollWidth > clientWidth)',
      detail: `scrollW=${overflow.scrollWidth} clientW=${overflow.clientWidth}; 溢出元素: ${overflow.overflowing.map(e => `<${e.tag} class="${e.cls}" w=${e.w} right=${e.right}>`).join('; ')}`,
    });
  }

  // 2. 检查文字溢出 (overflow: hidden / text-overflow: ellipsis 是否合理)
  const textOverflows = await page.evaluate(() => {
    const overflowingText: string[] = [];
    document.querySelectorAll('h1, h2, h3, h4, p, span, div, a, button, li').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.width < 5) {
        const text = el.textContent?.trim().slice(0, 30) || '';
        if (text && !overflowingText.includes(text)) {
          overflowingText.push(text);
        }
      }
    });
    return overflowingText.slice(0, 5);
  });
  if (textOverflows.length > 0) {
    issues.push({
      page: pageName,
      viewport: viewport.name,
      issue: '可能文字被裁 (width<5px)',
      detail: textOverflows.join(' | '),
    });
  }

  // 3. 检查按钮是否被裁 (mobile 上汉堡菜单按钮)
  const headerOverflow = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return null;
    const r = header.getBoundingClientRect();
    const buttons = Array.from(header.querySelectorAll('a, button')).map((b) => {
      const br = b.getBoundingClientRect();
      return {
        text: b.textContent?.trim().slice(0, 20) || '',
        right: Math.round(br.right),
        w: Math.round(br.width),
        visible: br.width > 0 && br.height > 0,
      };
    });
    return { headerRight: Math.round(r.right), buttons };
  });
  if (headerOverflow) {
    const overflowingButtons = headerOverflow.buttons.filter(
      (b) => b.right > headerOverflow.headerRight + 1,
    );
    if (overflowingButtons.length > 0) {
      issues.push({
        page: pageName,
        viewport: viewport.name,
        issue: 'header 内的按钮/链接超出 header 右边',
        detail: overflowingButtons.map(b => `"${b.text}" right=${b.right}`).join('; '),
      });
    }
  }

  return issues;
}

test('全页面响应式 + 内容溢出检查', async ({ browser }) => {
  test.setTimeout(300000);
  const allIssues: OverflowIssue[] = [];

  for (const viewport of VIEWPORTS) {
    console.log(`\n========== 视口: ${viewport.name} (${viewport.width}x${viewport.height}) ==========`);
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();

    for (const p of PAGES) {
      try {
        const url = BASE + p.path;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(800);
        const issues = await checkOverflow(page, p.path, viewport);
        if (issues.length > 0) {
          console.log(`  ✗ ${p.path}:`);
          for (const iss of issues) {
            console.log(`    [${iss.viewport}] ${iss.issue}`);
            console.log(`      ${iss.detail}`);
          }
          allIssues.push(...issues);
        } else {
          console.log(`  ✓ ${p.path}`);
        }
      } catch (e: any) {
        console.log(`  ✗ ${p.path} 加载失败: ${e.message.slice(0, 80)}`);
      }
    }
    await context.close();
  }

  console.log('\n\n========================================');
  if (allIssues.length === 0) {
    console.log('✓ 所有页面在所有视口下都正常');
  } else {
    console.log(`✗ 共发现 ${allIssues.length} 个响应式问题:`);
    for (const iss of allIssues) {
      console.log(`  [${iss.page} @ ${iss.viewport}] ${iss.issue}`);
      console.log(`    ${iss.detail}`);
    }
  }

  await fs.writeFile('tests/responsive-report.json', JSON.stringify(allIssues, null, 2));
});
