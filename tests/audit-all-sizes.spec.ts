// 全尺寸审计: 3 模板 × 1/3/5/9 条, 逐行量摘要的左右边界与行数
import { test } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:3000';
const ALL = ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', '01-09'];

async function build(page: any, ids: string[], tplLabel: string) {
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  for (const id of ALL) {
    const btn = page.locator(`.max-h-64 button:has(span.font-mono:text-is("${id}"))`).first();
    if ((await btn.count()) === 0) continue;
    const selected = ((await btn.getAttribute('class')) || '').includes('bg-seal');
    if (selected !== ids.includes(id)) {
      await btn.click();
      await page.waitForTimeout(100);
    }
  }
  await page.click('button:has-text("生成预览")');
  await page.waitForTimeout(1200);
  await page.click(`button:has-text("${tplLabel}")`);
  await page.waitForTimeout(1200);
}

// 逐行分类: 含"核心深墨"像素=标题行, 只含"灰字"像素=摘要行
async function audit(page: any) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const W = canvas.width;
    const H = canvas.height;
    const d = ctx.getImageData(0, 0, W, H).data;
    const isTitle = (i: number) =>
      Math.abs(d[i] - 42) <= 14 && Math.abs(d[i + 1] - 36) <= 14 && Math.abs(d[i + 2] - 24) <= 14;
    const isPlain = (i: number) =>
      Math.abs(d[i] - 107) <= 22 && Math.abs(d[i + 1] - 93) <= 22 && Math.abs(d[i + 2] - 74) <= 22;

    const yTop = 190;
    const yBottom = H - 105;
    const rows: Array<{ y0: number; y1: number; title: boolean; minX: number; maxX: number }> = [];
    let run: { y0: number; y1: number; title: boolean; minX: number; maxX: number } | null = null;
    let gap = 0;
    for (let y = yTop; y < yBottom; y++) {
      let hasTitle = false;
      let hasPlain = false;
      let minX = W;
      let maxX = -1;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (isTitle(i)) hasTitle = true;
        if (isPlain(i)) {
          hasPlain = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
      if (!hasTitle && !hasPlain) {
        if (run) {
          gap++;
          if (gap > 4) {
            rows.push(run);
            run = null;
            gap = 0;
          }
        }
        continue;
      }
      gap = 0;
      if (run && y - run.y1 <= 3) {
        run.y1 = y;
        run.title = run.title || hasTitle;
        if (maxX >= 0) {
          if (minX < run.minX) run.minX = minX;
          if (maxX > run.maxX) run.maxX = maxX;
        }
      } else {
        if (run) rows.push(run);
        run = { y0: y, y1: y, title: hasTitle, minX, maxX };
      }
    }
    if (run) rows.push(run);

    const summary = rows.filter((r) => !r.title && r.maxX > 0);
    return {
      W,
      H,
      titleRows: rows.filter((r) => r.title).length,
      summaryRows: summary.length,
      summary: summary.map((r) => ({
        left: r.minX,
        right: r.maxX,
        rightMargin: W - r.maxX,
      })),
    };
  });
}

const COMBOS: Array<[string, string, string]> = [];
for (const [tplFile, tplLabel] of [
  ['story', '竖版'],
  ['square', '方形'],
  ['wide', '横版'],
] as Array<[string, string]>) {
  for (const n of [1, 3, 5, 9]) {
    COMBOS.push([`${tplFile}-${n}`, tplLabel, String(n)]);
  }
}

for (const [name, tplLabel, nStr] of COMBOS) {
  const n = Number(nStr);
  test(`审计 ${name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await build(page, ALL.slice(0, n), tplLabel);
    const r = await audit(page);
    const file = `tests/screenshots/audit-${name}.png`;
    const dataUrl = await page.evaluate(() => {
      const img = document.querySelector('img[alt^="海报预览"]') as HTMLImageElement;
      return img ? img.src : null;
    });
    if (dataUrl) fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));

    const s = r.summary;
    const lefts = s.map((x: { left: number }) => x.left);
    const rights = s.map((x: { rightMargin: number }) => x.rightMargin);
    const f = (a: number[]) => (a.length ? `${Math.min(...a)}~${Math.max(...a)}` : '-');
    console.log(
      `\n[${name}] 画布 ${r.W}x${r.H} | 标题行 ${r.titleRows} | 摘要行 ${r.summaryRows}` +
        ` (每条约 ${n > 0 ? (r.summaryRows / n).toFixed(1) : '-'} 行)` +
        `\n   摘要左边距 ${f(lefts)} | 摘要右边距 ${f(rights)}`,
    );
    await ctx.close();
  });
}
