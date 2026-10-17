// 关键路径 - 真实逐项点击
import { test, expect } from '@playwright/test';
import { LIFE_STAGES } from '../src/lib/life-stages';
import { allEntries } from '../src/lib/entries';

const BASE = 'http://localhost:3000';

test.describe('关键路径 - 真实逐项点击', () => {
  test('1. 首页 -> Header 5 链接', async ({ page }) => {
    // 用 href 而非 text 定位 (更稳定)
    const cases = [
      { selector: 'header a[href="/"]', expected: '/', name: 'logo' },
      { selector: 'header a[href="/explore"]', expected: '/explore', name: '检索' },
      { selector: 'header a[href="/emergency"]', expected: '/emergency', name: '急方' },
      { selector: 'header a[href="/my"]', expected: '/my', name: '我的' },
      { selector: 'header a[href="/about"]', expected: '/about', name: '卷末' },
    ];
    for (const c of cases) {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      const link = page.locator(c.selector).first();
      await expect(link).toBeVisible();
      await Promise.all([
        page.waitForURL(new RegExp(c.expected.replace(/\//g, '\\/') + '$')),
        link.click(),
      ]);
      console.log(`  ✓ ${c.name} -> ${c.expected}`);
    }
  });

  test('2. 首页 -> 12 急救卡片全部', async ({ page }) => {
    test.setTimeout(180_000); // 12 个场景串行, 需要更长
    const scenarios = ['心脏骤停', '大出血', '烧烫伤', '噎住', '中暑', '一氧化碳', '心梗', '卒中', '过敏性休克', '癫痫', '低血糖', '触电'];
    for (const s of scenarios) {
      await page.goto(BASE);
      await page.waitForLoadState('domcontentloaded');
      // 找卡片链接
      const link = page.locator(`a[href*="/emergency/"]`).filter({ hasText: s }).first();
      await expect(link).toBeVisible({ timeout: 10_000 });
      await Promise.all([
        page.waitForURL(/\/emergency\//, { timeout: 10_000 }),
        link.click(),
      ]);
      // 验证页面有 tel:120
      await expect(page.locator('a[href="tel:120"]').first()).toBeVisible({ timeout: 5_000 });
      console.log(`  ✓ ${s} -> 详情页 + 120 拨号`);
    }
  });

  test('3. 首页 -> 各人生阶段', async ({ page }) => {
    // 从数据源取阶段名, 不再硬编码 —— 原来写的是['高中生','大学生','刚工作','中年','退休前后'],
    // 其中"刚工作"早已不存在于阶段表里, 这条用例一直在失败(过时断言)
    const stages = Object.keys(LIFE_STAGES);
    expect(stages.length).toBe(6);
    for (const s of stages) {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const link = page.locator(`a[href*="/explore?stage="]`).filter({ hasText: s }).first();
      await expect(link).toBeVisible();
      await Promise.all([
        page.waitForURL(/stage=/),
        link.click(),
      ]);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      // 验证有过滤条数
      const h1 = page.locator('h1').first();
      await expect(h1).toContainText(s);
      await expect(page.locator('text=/共.*\\d+.*条/').first()).toBeVisible();
      console.log(`  ✓ 阶段 ${s} -> 过滤生效`);
    }
  });

  test('4. 单节页 -> 上下回 + 本卷其他', async ({ page }) => {
    await page.goto(BASE + '/book/01-05');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    // 上一回: 用 nav 区域定位, 避免点错
    const prevLink = page.locator('nav a[href="/book/01-04"]').first();
    await expect(prevLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/book\/01-04/),
      prevLink.click(),
    ]);
    console.log('  ✓ 上一回: 01-05 -> 01-04');

    // 下一回
    await page.goto(BASE + '/book/01-04');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const nextLink = page.locator('nav a[href="/book/01-05"]').first();
    await expect(nextLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/book\/01-05/),
      nextLink.click(),
    ]);
    console.log('  ✓ 下一回: 01-04 -> 01-05');

    // 本卷其他
    await page.goto(BASE + '/book/01-01');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const otherLinks = page.locator('a[href^="/book/01-"]');
    const count = await otherLinks.count();
    expect(count).toBeGreaterThanOrEqual(40);
    console.log(`  ✓ 本卷其他条目: ${count} 个`);
  });

  test('5. EntryCard - 藏/传/卷开/勾选', async ({ page }) => {
    await page.goto(BASE + '/explore');
    // 清空 localStorage
    await page.evaluate(() => localStorage.removeItem('housheng-lu:my-list:v2'));
    await page.reload();

    const card = page.locator('article').first();
    // 藏按钮
    const saveBtn = card.locator('button', { hasText: '藏' });
    await saveBtn.click();
    await page.waitForTimeout(200);
    const ls = await page.evaluate(() => localStorage.getItem('housheng-lu:my-list:v2'));
    expect(ls).not.toBeNull();
    console.log('  ✓ 藏 -> localStorage 写入');

    // 取消藏 (再次点击变成 "已藏" -> 删除)
    const unSaveBtn = card.locator('button', { hasText: '已藏' });
    if ((await unSaveBtn.count()) > 0) {
      await unSaveBtn.click();
      await page.waitForTimeout(200);
      const ls2 = await page.evaluate(() => JSON.parse(localStorage.getItem('housheng-lu:my-list:v2') || '[]'));
      console.log(`  ✓ 取消藏后: ${ls2.length} 条`);
    }

    // 卷开
    const toggleBtn = card.locator('button', { hasText: '卷开' });
    if ((await toggleBtn.count()) > 0) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
      await expect(card.locator('button', { hasText: '收起' })).toBeVisible();
      console.log('  ✓ 卷开 -> 展开数据层');
    }

    // 勾选 (✓)
    const doneBtn = card.locator('button').filter({ hasText: '✓' }).first();
    if ((await doneBtn.count()) > 0) {
      await doneBtn.click();
      await page.waitForTimeout(200);
      const ls3 = await page.evaluate(() => JSON.parse(localStorage.getItem('housheng-lu:my-list:v2') || '[]'));
      const has = ls3.some((i: any) => i.status === 'done');
      expect(has).toBe(true);
      console.log('  ✓ 勾选完成 -> localStorage 状态=done');
    }

    // 传 (分享)
    const shareBtn = card.locator('button', { hasText: '传' });
    if ((await shareBtn.count()) > 0) {
      console.log('  ✓ 传按钮存在');
    }
  });

  test('6. /my - 4 tab 切换', async ({ page }) => {
    // 先准备数据
    await page.goto(BASE + '/explore');
    await page.evaluate(() => localStorage.removeItem('housheng-lu:my-list:v2'));
    await page.reload();
    const card = page.locator('article').first();
    await card.locator('button', { hasText: '藏' }).click();
    await page.waitForTimeout(200);
    await card.locator('button').filter({ hasText: '✓' }).first().click();
    await page.waitForTimeout(200);

    // /my
    await page.goto(BASE + '/my');
    // 4 个 tab
    const tabs = page.locator('button').filter({ hasText: /^全部|待办|已完成|已藏/ });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(4);

    // 切到 已完成
    await page.locator('button').filter({ hasText: '已完成' }).click();
    await page.waitForTimeout(200);
    console.log('  ✓ 切到 已完成 tab');

    // 切到 待办
    await page.locator('button').filter({ hasText: '待办' }).click();
    await page.waitForTimeout(200);
    console.log('  ✓ 切到 待办 tab');

    // 移除按钮
    const removeBtn = page.locator('button[title="移出清单"]').first();
    if ((await removeBtn.count()) > 0) {
      await removeBtn.click();
      await page.waitForTimeout(200);
      console.log('  ✓ 移除按钮');
    }
  });

  test('7. /explore - 筛选交互', async ({ page }) => {
    await page.goto(BASE + '/explore');
    // 勾选 A 级
    await page.locator('label').filter({ hasText: 'A 级' }).first().locator('input').check();
    await page.waitForTimeout(300);
    const t1 = await page.locator('text=/共.*\\d+.*条/').first().textContent();
    console.log(`  ✓ 勾选 A 级: ${t1}`);

    // 搜索
    const search = page.locator('input[placeholder*="检索"]');
    await search.fill('疫苗');
    await page.waitForTimeout(500);
    const t2 = await page.locator('text=/共.*\\d+.*条/').first().textContent();
    console.log(`  ✓ 搜索"疫苗": ${t2}`);

    // 清空
    await page.locator('button:has-text("清空筛选")').click();
    await page.waitForTimeout(300);
    const t3 = await page.locator('text=/共.*\\d+.*条/').first().textContent();
    // 用实际条目数断言, 不再硬编码 699 (那是旧数据量, 早已过时)
    expect(t3).toContain(String(allEntries.length));
    console.log(`  ✓ 清空筛选 -> ${allEntries.length}`);
  });

  test('8. /emergency/心脏骤停 - 全部按钮', async ({ page }) => {
    await page.goto(BASE + '/emergency/心脏骤停');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    // 归急方卷
    const backLink = page.locator('a:has-text("归急方卷")').first();
    await expect(backLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/emergency$/),
      backLink.click(),
    ]);
    console.log('  ✓ 归急方卷 -> /emergency');

    // 120 拨号
    await page.goto(BASE + '/emergency/心脏骤停');
    await page.waitForLoadState('networkidle');
    const telLink = page.locator('a[href="tel:120"]').first();
    const href = await telLink.getAttribute('href');
    expect(href).toBe('tel:120');
    console.log('  ✓ 120 拨号链接');
  });
});
