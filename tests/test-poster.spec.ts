// 真实测试海报生成器 - 用 Playwright 逐项点击 + 验证下载
import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';

const BASE = 'http://localhost:3000';

test('海报生成 - 全流程 + 真实下载验证', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');

  // 测试 1: 默认状态, 选 1 条 + 方形模板
  console.log('\n=== 测试 1: 方形 + 1 条 ===');
  await page.locator('button:has-text("生成预览")').click();
  await page.waitForTimeout(1000);
  // 验证预览图有正确尺寸
  const img1 = page.locator('img[alt*="海报预览"]');
  await expect(img1).toBeVisible();
  const w1 = await img1.getAttribute('width');
  const h1 = await img1.getAttribute('height');
  console.log(`  预览图 width=${w1} height=${h1}`);
  expect(w1).toBe('1080');
  expect(h1).toBe('1080');

  // 测试 2: 切到竖版 - 验证自动重渲染
  console.log('\n=== 测试 2: 切到竖版 + 1 条 ===');
  await page.locator('button[aria-pressed]').filter({ hasText: '竖版' }).click();
  await page.waitForTimeout(1500);
  const img2 = page.locator('img[alt*="海报预览"]');
  await expect(img2).toBeVisible();
  const w2 = await img2.getAttribute('width');
  const h2 = await img2.getAttribute('height');
  console.log(`  切到竖版后: width=${w2} height=${h2}`);
  expect(w2).toBe('1080');
  expect(h2).toBe('1920');

  // 测试 3: 下载竖版 - 验证下载的 PNG 实际尺寸 = 1080x1920
  console.log('\n=== 测试 3: 实际下载竖版 PNG ===');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('button:has-text("下载")').click();
  const download = await downloadPromise;
  const path = await download.path();
  const filename = download.suggestedFilename();
  console.log(`  下载文件名: ${filename}`);
  expect(filename).toContain('1080x1920');
  // 读 PNG 尺寸
  const buf = await fs.readFile(path!);
  // PNG 头部: 8 字节签名 + 4 字节长度 + 4 字节 "IHDR" + 4 字节宽 + 4 字节高
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  console.log(`  实际 PNG 尺寸: ${width}×${height}`);
  expect(width).toBe(1080);
  expect(height).toBe(1920);

  // 测试 4: 切到横版
  console.log('\n=== 测试 4: 切到横版 + 1 条 ===');
  await page.locator('button[aria-pressed]').filter({ hasText: '横版' }).click();
  await page.waitForTimeout(1500);
  const downloadPromise2 = page.waitForEvent('download');
  await page.locator('button:has-text("下载")').click();
  const download2 = await downloadPromise2;
  const path2 = await download2.path();
  const filename2 = download2.suggestedFilename();
  console.log(`  下载文件名: ${filename2}`);
  expect(filename2).toContain('1200x630');
  const buf2 = await fs.readFile(path2!);
  expect(buf2.readUInt32BE(16)).toBe(1200);
  expect(buf2.readUInt32BE(20)).toBe(630);
  console.log(`  实际 PNG 尺寸: ${buf2.readUInt32BE(16)}×${buf2.readUInt32BE(20)} ✓`);

  // 测试 5: 选 3 条 + 方形 - 验证布局自适应
  console.log('\n=== 测试 5: 方形 + 3 条 ===');
  await page.locator('button[aria-pressed]').filter({ hasText: '方形' }).click();
  await page.waitForTimeout(800);
  // 点击快选 (3 条) - 用精确选择器, 避免和"急救 心脏骤停 (1)"混淆
  await page.locator('button:has-text("安全+急救+法律")').click();
  // 等待 useEffect 自动重渲染 (selectedIds 变化触发)
  await page.waitForTimeout(1500);
  const img3 = page.locator('img[alt*="海报预览"]');
  await expect(img3).toBeVisible();
  const w3 = await img3.getAttribute('width');
  const h3 = await img3.getAttribute('height');
  console.log(`  3 条方形: ${w3}×${h3}`);
  expect(w3).toBe('1080');
  expect(h3).toBe('1080');

  // 测试 6: 选 3 条 + 竖版
  console.log('\n=== 测试 6: 竖版 + 3 条 ===');
  await page.locator('button[aria-pressed]').filter({ hasText: '竖版' }).click();
  await page.waitForTimeout(1500);
  const downloadPromise3 = page.waitForEvent('download');
  await page.locator('button:has-text("下载")').click();
  const download3 = await downloadPromise3;
  const path3 = await download3.path();
  const filename3 = download3.suggestedFilename();
  const buf3 = await fs.readFile(path3!);
  const w3PNG = buf3.readUInt32BE(16);
  const h3PNG = buf3.readUInt32BE(20);
  console.log(`  3 条竖版: ${filename3} → ${w3PNG}×${h3PNG}`);
  expect(w3PNG).toBe(1080);
  expect(h3PNG).toBe(1920);
});

test('海报 - 9 条最大支持', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(BASE + '/poster');
  await page.waitForLoadState('networkidle');
  // 选 9 个不同 id (通过快速点击列表项)
  const ids = ['01-01', '01-05', '01-12', '05-05', '08-08', '10-01', '13-01', '02-09', '34-01'];
  for (const id of ids) {
    // 通过 id 搜索
    const search = page.locator('input[placeholder*="搜条目"]');
    await search.fill(id);
    await page.waitForTimeout(300);
    // 选第一条 (就是目标)
    const firstItem = page.locator('.max-h-64 button').first();
    await firstItem.click();
    await page.waitForTimeout(100);
    // 清空搜索框准备下一次
    await search.fill('');
    await page.waitForTimeout(100);
  }
  // 验证已选 9 条
  const selectedText = await page.locator('text=/已选 \\d+\\/9/').textContent();
  console.log(`  ${selectedText}`);
  expect(selectedText).toContain('9/9');
  // 切到方形 + 生成预览
  await page.locator('button[aria-pressed]').filter({ hasText: '方形' }).click();
  await page.waitForTimeout(2500);
  const preview = page.locator('img[alt*="海报预览"]');
  await expect(preview).toBeVisible();
  // 下载验证尺寸
  const downloadPromise = page.waitForEvent('download');
  await page.locator('button:has-text("下载")').click();
  const download = await downloadPromise;
  const path = await download.path();
  const buf = await fs.readFile(path!);
  console.log(`  9 条方形下载: ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}`);
  expect(buf.readUInt32BE(16)).toBe(1080);
  expect(buf.readUInt32BE(20)).toBe(1080);
  // 再选 1 个 -> 应该提示最多 9
  const search = page.locator('input[placeholder*="搜条目"]');
  await search.fill('34-02');
  await page.waitForTimeout(300);
  await page.locator('.max-h-64 button').first().click();
  await page.waitForTimeout(500);
  const newText = await page.locator('text=/已选 \\d+\\/9/').textContent();
  console.log(`  超过 9 限制后: ${newText}`);
  expect(newText).toContain('9/9'); // 仍 9/9
});
