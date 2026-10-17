// 审计: aria-live 精确探针 — 只读
import { test } from '@playwright/test';
import { BASE, AUDIT_PAGES } from './audit-pages';

test.use({ trace: 'off', screenshot: 'off' });

const LIVE_JS = `(() => {
  return [...document.querySelectorAll('[aria-live],[role="status"],[role="alert"],[role="log"],[role="progressbar"]')].map((e) => ({
    tag: e.tagName.toLowerCase(),
    cls: (e.getAttribute('class') || '').slice(0, 50),
    live: e.getAttribute('aria-live'),
    role: e.getAttribute('role'),
    text: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30),
    outer: e.outerHTML.slice(0, 110),
  }));
})()`;

test('aria-live 各页静息态', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const [path, label] of AUDIT_PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const r: any[] = await page.evaluate(LIVE_JS);
    console.log(`\n[静息 ${label} ${path}] 命中 ${r.length} 个`);
    for (const x of r) console.log(`   ${x.tag} live=${x.live} role=${x.role} "${x.text}" ${x.cls}`);
  }
});

test('aria-live /ask loading 期间', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('**/api/ask', async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await page.goto(BASE + '/ask', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const atRest: any[] = await page.evaluate(LIVE_JS);
  console.log(`\n[/ask 静息] 命中 ${atRest.length} 个`);
  for (const x of atRest) console.log(`   ${x.outer}`);
  await page.fill('#q-input', '心脏骤停');
  await page.click('button:has-text("问 卷")');
  await page.waitForTimeout(800);
  const loading: any[] = await page.evaluate(LIVE_JS);
  console.log(`[/ask 加载中] 命中 ${loading.length} 个`);
  for (const x of loading) console.log(`   ${x.tag} live=${x.live} role=${x.role} "${x.text}"\n      ${x.outer}`);
  await page.waitForTimeout(3500);
  const done: any[] = await page.evaluate(LIVE_JS);
  console.log(`[/ask 出结果后] 命中 ${done.length} 个`);
  for (const x of done) console.log(`   ${x.tag} live=${x.live} role=${x.role} "${x.text}"`);
});

test('触发 toast 后 aria-live 是否存在', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/my', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => document.querySelectorAll('[aria-live]').length);
  // 去 /explore 收藏一条 -> 触发 toast("已藏")
  await page.goto(BASE + '/explore', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.locator('article button:has-text("藏")').first().click();
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({
    n: document.querySelectorAll('[aria-live]').length,
    html: [...document.querySelectorAll('[aria-live]')].map((e) => e.outerHTML.slice(0, 130)),
  }));
  console.log(`\n[toast] /my 静息 aria-live 数=${before}`);
  console.log(`[toast] 点"藏"后 aria-live 数=${after.n}`);
  for (const h of after.html) console.log(`   ${h}`);
  await page.waitForTimeout(2800);
  const gone = await page.evaluate(() => document.querySelectorAll('[aria-live]').length);
  console.log(`[toast] 2.8s 后 aria-live 数=${gone} (容器随内容一起卸载)`);
});
