// 问卷页功能完整检查: 空态 / 示例提问 / 结果与引用 / 出处链接 / 历史 / 错误态与重试 / 取消
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

/**
 * /api/ask 是 10 次/分/IP 限流的; 反复跑用例时会共用一个桶 → 后续请求拿到 429 而"假失败"。
 * 这里给每个用例一个独立 IP 头, 让测试与人工调试互不干扰。
 * (顺带说明: 限流口径确实取自客户端可控头, 裸 next start 下可被伪造 —— 见审计报告 P0-E)
 */
let ipSeq = 0;
test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({
    'CF-Connecting-IP': `10.44.${(ipSeq++ % 200) + 1}.${Math.floor(Math.random() * 250) + 1}`,
  });
});

test('问卷页: 空态与无障碍属性', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/ask');
  await page.waitForLoadState('networkidle');

  const info = await page.evaluate(() => {
    const ta = document.querySelector('#q-input') as HTMLTextAreaElement;
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('问 卷')) as HTMLButtonElement;
    const chips = Array.from(document.querySelectorAll('button')).filter((b) => b.className.includes('border-border') && b.textContent && b.textContent.length > 3);
    return {
      textareaMaxLength: ta?.maxLength,
      textareaDescribedBy: ta?.getAttribute('aria-describedby'),
      hintText: document.querySelector('#q-hint')?.textContent?.trim(),
      buttonDisabled: btn?.disabled,
      buttonTitle: btn?.getAttribute('title'),
      exampleChips: chips.length,
      politeRegions: document.querySelectorAll('[aria-live="polite"]').length,
      alertRegions: document.querySelectorAll('[role="alert"]').length,
      hasPrivacy: (document.body.innerText || '').includes('隐私说明'),
    };
  });
  console.log('空态:', JSON.stringify(info, null, 1));
  expect(info.textareaMaxLength).toBe(500);
  expect(info.textareaDescribedBy).toBe('q-hint');
  expect(info.buttonDisabled).toBe(true);
  expect(info.buttonTitle).toBe('请先输入问题');
  expect(info.politeRegions).toBe(1); // 单一常驻 polite region
  expect(info.alertRegions).toBe(1);
  expect(info.hasPrivacy).toBe(true);
});

test('问卷页: 点示例 → 出答案与引用(含出处链接, 无嵌套 a)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(BASE + '/ask');
  await page.waitForLoadState('networkidle');

  await page.locator('button:has-text("心脏骤停怎么办?")').click();
  // 不要在这里断言"正在翻阅": 本地纯检索 ~10ms 就返回, 断言会与响应赛跑而随机失败。
  // 加载态与取消由下面用"延迟路由"的用例确定性覆盖。
  // 结果
  await page.locator('[data-testid="ask-result"]').waitFor({ timeout: 15000 });

  const r = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('ul li'));
    const first = items[0];
    const answerText = document.querySelector('section .whitespace-pre-wrap')?.textContent || '';
    return {
      citationCount: items.length,
      // 正文里 [1] [2] ... 的条目数, 必须与下方"引用"列表条数一致
      answerEntries: (answerText.match(/^\[\d+\]/gm) || []).length,
      firstId: first?.querySelector('.font-mono')?.textContent,
      bookLinks: document.querySelectorAll('a[href^="/book/"]').length,
      sourceLinks: Array.from(document.querySelectorAll('a[target="_blank"]')).map((a) => (a as HTMLAnchorElement).href).slice(0, 2),
      nestedAnchor: document.querySelectorAll('a a').length,
      // 徽章要按精确文案取: 急方卡也是 section 里的 span, 直接取第一个会取错
      modelBadge: Array.from(document.querySelectorAll('section span'))
        .map((s) => s.textContent?.trim())
        .find((t) => t === 'AI 引用' || t === '原文检索'),
    };
  });
  console.log('结果:', JSON.stringify(r, null, 1));
  expect(r.citationCount).toBeGreaterThan(0);
  expect(r.firstId).toBe('13-01'); // 检索质量: 心脏骤停 → 心肺复苏条目
  expect(r.nestedAnchor).toBe(0); // 不允许 <a> 套 <a>
  expect(r.bookLinks).toBeGreaterThan(0);
  // 正文列举的条目数应与引用列表一致 —— 仅适用于纯检索模式 (AI 模式正文是散文, 不逐条列举)
  if (r.modelBadge === 'AI 引用') {
    expect(r.answerEntries).toBe(0);
  } else {
    expect(r.answerEntries).toBe(r.citationCount);
  }

  // 出结果后示例问题仍可再次取用 (原来回答后示例就永久消失了)
  await page.locator('button:has-text("换个问题试试")').click();
  await expect(page.locator('button:has-text("被骗了钱能追回吗?")')).toBeVisible();

  // 「急方」分步卡: 危及生命的问题必须先给出可执行的 4 步 + 离线卡片入口
  const emg = await page.evaluate(() => {
    const block = Array.from(document.querySelectorAll('div')).find((d) =>
      (d.textContent || '').includes('急方 · 心脏骤停'),
    );
    if (!block) return null;
    const link = block.querySelector('a[href^="/emergency/"]') as HTMLAnchorElement | null;
    return {
      steps: block.querySelectorAll('ol li').length,
      link: link?.getAttribute('href'),
      labeled: (block.textContent || '').includes('非原书条目'),
    };
  });
  console.log('急方块:', JSON.stringify(emg));
  expect(emg).not.toBeNull();
  expect(emg!.steps).toBe(4);
  expect(emg!.link).toBe('/emergency/' + encodeURIComponent('心脏骤停'));
  expect(emg!.labeled).toBe(true); // 必须标注它不是原书条目
});

test('问卷页: 第二次提问后出现历史, 点历史回填', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(BASE + '/ask');
  await page.waitForLoadState('networkidle');

  // 注意: 只能用页面真实存在的示例问题 (EXAMPLE_QUESTIONS)
  await page.locator('button:has-text("被骗了钱能追回吗?")').click();
  await page.locator('[data-testid="ask-result"]').waitFor({ timeout: 15000 });

  await page.fill('#q-input', '低钠盐真的有用吗?');
  await page.locator('button:has-text("问 卷")').click();
  await page.locator('[data-testid="ask-result"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);

  const h = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('section button')).map((b) => b.textContent?.trim());
    return { historyItems: btns.filter((t) => t && t.includes('?')) };
  });
  console.log('历史:', JSON.stringify(h));
  expect(h.historyItems.length).toBeGreaterThan(0);

  // 点历史第一条 → 输入框回填
  await page.locator(`section button:has-text("${h.historyItems[0]}")`).first().click();
  await page.waitForTimeout(400);
  const val = await page.inputValue('#q-input');
  console.log('回填:', val);
  expect(val.length).toBeGreaterThan(0);
});

test('问卷页: 接口 500 时出现内联错误与重试按钮 (此前只弹 toast)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let fail = true;
  await page.route('**/api/ask', async (route) => {
    if (fail) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '上游炸了' }) });
    } else {
      await route.continue();
    }
  });
  await page.goto(BASE + '/ask');
  await page.waitForLoadState('networkidle');

  await page.fill('#q-input', '低钠盐真的有用吗?');
  await page.locator('button:has-text("问 卷")').click();

  // 注意: Next 自带 __next-route-announcer__ 也带 role=alert, 必须按文案收窄
  const err = page.locator('[role="alert"]:has-text("没能取到回答")');
  await expect(err.locator('text=没能取到回答')).toBeVisible({ timeout: 10000 });
  console.log('错误态文案:', (await err.innerText()).replace(/\n+/g, ' | ').slice(0, 120));
  await expect(err.locator('button:has-text("重试")')).toBeVisible();

  // 重试: 放开拦截后应能出结果
  fail = false;
  await err.locator('button:has-text("重试")').click();
  await page.locator('[data-testid="ask-result"]').waitFor({ timeout: 15000 });
  const ok = await page.evaluate(() => document.querySelectorAll('a[href^="/book/"]').length);
  console.log('重试后引用链接数:', ok);
  expect(ok).toBeGreaterThan(0);
});

test('问卷页: 加载中可取消', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/api/ask', async (route) => {
    await new Promise((r) => setTimeout(r, 3000)); // 拖住, 制造可取消窗口
    await route.continue();
  });
  await page.goto(BASE + '/ask');
  await page.waitForLoadState('networkidle');

  await page.fill('#q-input', '体检前要空腹多久?');
  await page.locator('button:has-text("问 卷")').click();
  await expect(page.locator('text=正在翻阅')).toBeVisible();
  await expect(page.locator('button:has-text("取消")')).toBeVisible();
  await page.locator('button:has-text("取消")').click();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({
    loading: (document.body.innerText || '').includes('正在翻阅'),
    submitBack: !!Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('问 卷')),
  }));
  console.log('取消后:', JSON.stringify(after));
  expect(after.loading).toBe(false);
  expect(after.submitBack).toBe(true);
});
