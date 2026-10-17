// 把 6 个 logo 版本拼成一张对比图
import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:3000';

test('6 个 logo 方案对比图', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(`${BASE}/logo-preview/v1`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // 创建一个对比页 - 抓 6 个 logo 并排
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #F2E8D5;
      font-family: "LXGW WenKai TC", "Songti SC", serif;
      padding: 40px;
    }
    h1 {
      text-align: center;
      color: #2A2418;
      font-size: 36px;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }
    .subtitle {
      text-align: center;
      color: #6B5D4A;
      font-size: 16px;
      font-style: italic;
      margin-bottom: 40px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .card {
      background: #F2E8D5;
      border: 1px solid #C9B894;
      padding: 24px 16px;
      text-align: center;
    }
    .card-num {
      color: #B73229;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.15em;
      margin-bottom: 4px;
    }
    .card-title {
      color: #2A2418;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .card-desc {
      color: #6B5D4A;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .card-logo {
      width: 160px;
      height: 160px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-logo img {
      max-width: 100%;
      max-height: 100%;
    }
    .highlight {
      border: 2px solid #B73229;
      box-shadow: 0 0 0 3px rgba(183, 50, 41, 0.15);
    }
    .recommend {
      color: #B73229;
      font-size: 11px;
      margin-top: 8px;
      font-weight: 700;
    }
  </style>
  </head>
  <body>
    <h1>厚生錄 · Logo 设计方案对比</h1>
    <p class="subtitle">HouSheng Lu · Records of Living Well — 6 candidates</p>
    <div class="grid">
      <div class="card">
        <div class="card-num">V1</div>
        <div class="card-title">方形三字</div>
        <div class="card-desc">当前方案</div>
        <div class="card-logo"><img src="/logo/seal-square.svg" /></div>
        <div style="color: #888; font-size: 11px; margin-top: 8px;">"厚" 居中, "生錄" 分两边 — 视觉不平衡</div>
      </div>
      <div class="card highlight">
        <div class="card-num">V2</div>
        <div class="card-title">竖排方印</div>
        <div class="card-desc">仿传统朱印 100×140</div>
        <div class="card-logo"><img src="/logo/design-2-vertical.svg" /></div>
        <div class="recommend">★ 推荐</div>
      </div>
      <div class="card">
        <div class="card-num">V3</div>
        <div class="card-title">横排双线椭圆</div>
        <div class="card-desc">像藏书印 130×60</div>
        <div class="card-logo"><img src="/logo/design-3-horizontal.svg" /></div>
      </div>
      <div class="card">
        <div class="card-num">V4</div>
        <div class="card-title">极简现代</div>
        <div class="card-desc">细线 + 角块装饰</div>
        <div class="card-logo"><img src="/logo/design-4-minimal.svg" /></div>
      </div>
      <div class="card">
        <div class="card-num">V5</div>
        <div class="card-title">古典线装</div>
        <div class="card-desc">古书装订孔 + 边线</div>
        <div class="card-logo"><img src="/logo/design-5-classic.svg" /></div>
      </div>
      <div class="card">
        <div class="card-num">V6</div>
        <div class="card-title">组合版</div>
        <div class="card-desc">印章 + 英文 slogan</div>
        <div class="card-logo" style="width: 200px; height: 100px;">
          <img src="/logo/design-6-combined.svg" />
        </div>
      </div>
    </div>
  </body>
  </html>`;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tests/logo-compare.png', fullPage: true });
  console.log('✓ saved tests/logo-compare.png');
});
