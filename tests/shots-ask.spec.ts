// 问卷页三种状态出图: 空态 / 已回答 / 错误态
import { test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

test('问卷页三态出图', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });

  // 1) 空态
  await page.goto(BASE + '/ask');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'tests/screenshots/out-ask-empty.png', fullPage: true });

  // 2) 已回答
  await page.locator('button:has-text("心脏骤停怎么办?")').click();
  await page.locator('[data-testid="ask-result"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'tests/screenshots/out-ask-answer.png', fullPage: true });

  // 3) 错误态
  await page.route('**/api/ask', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '服务暂时不可用' }) }),
  );
  await page.fill('#q-input', '低钠盐真的有用吗?');
  await page.locator('button:has-text("问 卷")').click();
  await page.locator('[role="alert"]:has-text("没能取到回答")').waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/screenshots/out-ask-error.png', fullPage: true });

  // 4) AI 设置面板 (开源项目"clone 下来怎么配 key"的入口)
  await page.unroute('**/api/ask');
  await page.goto(BASE + '/ask');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.locator('button:has-text("AI 设置")').click();
  await page.waitForTimeout(300);
  // 截整个设置区 (含入口按钮), 别用固定 clip —— 会把"保存到本机"切掉
  await page.locator('section:has(#ask-settings)').screenshot({
    path: 'tests/screenshots/out-ask-settings.png',
  });
});
