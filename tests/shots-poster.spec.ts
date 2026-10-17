// 三种模板出图, 用于目视确认
import { test } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:3000';

async function build(page: any, ids: string[], tplLabel: string) {
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  const all = ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', '01-09'];
  for (const id of all) {
    const btn = page.locator(`.max-h-64 button:has(span.font-mono:text-is("${id}"))`).first();
    if ((await btn.count()) === 0) continue;
    const selected = ((await btn.getAttribute('class')) || '').includes('bg-seal');
    const want = ids.includes(id);
    if (selected !== want) {
      await btn.click();
      await page.waitForTimeout(120);
    }
  }
  await page.click('button:has-text("生成预览")');
  await page.waitForTimeout(1500);
  await page.click(`button:has-text("${tplLabel}")`);
  await page.waitForTimeout(1500);
}

async function shoot(page: any, file: string) {
  const dataUrl = await page.evaluate(() => {
    const img = document.querySelector('img[alt^="海报预览"]') as HTMLImageElement;
    return img ? img.src : null;
  });
  if (!dataUrl) throw new Error('no preview');
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved', file);
}

const NINE = ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', '01-09'];
const FIVE = ['01-01', '01-02', '01-03', '01-04', '01-05'];

for (const [file, ids, tpl] of [
  ['tests/screenshots/out-single-story.png', ['01-01'], '竖版'],
  ['tests/screenshots/out-story-5.png', FIVE, '竖版'],
  ['tests/screenshots/out-story-9.png', NINE, '竖版'],
  ['tests/screenshots/out-square-9.png', NINE, '方形'],
  ['tests/screenshots/out-wide-9.png', NINE, '横版'],
] as Array<[string, string[], string]>) {
  test(`出图 ${file}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await build(page, ids, tpl);
    await shoot(page, file);
    await ctx.close();
  });
}
