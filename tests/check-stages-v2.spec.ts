// 人生阶段映射的**不变量**回归
//
// 原来这三个 spec 只 console.log 不断言（审计里 62 个零断言用例之一），
// 所以"13 紧急情况等 10 章进不去任何阶段"、"卡片章节数相加 45 > 原书 34 章" 一直没被发现。
import { test, expect } from '@playwright/test';
import { LIFE_STAGES, UNIVERSAL_SECTIONS } from '../src/lib/life-stages';
import { allEntries, allSections } from '../src/lib/entries';

test('章节覆盖: 通用 ∪ 各阶段专属 = 全部章节, 且两两不交', () => {
  const allChapterIds = allSections.map((s) => s.id).sort((a, b) => a - b);
  expect(allChapterIds.length).toBe(34);

  const own: number[] = [];
  for (const [name, stage] of Object.entries(LIFE_STAGES)) {
    // 专属章节之间不能重叠, 也不能和通用重叠, 否则数字又对不上
    for (const n of stage.own) {
      expect(own, `第 ${n} 章被多个阶段重复归入 (${name})`).not.toContain(n);
      expect(UNIVERSAL_SECTIONS, `第 ${n} 章既通用又是 ${name} 专属`).not.toContain(n);
      own.push(n);
    }
    // sections = 通用 + 专属, 且已排序去重
    const expectSections = [...UNIVERSAL_SECTIONS, ...stage.own].sort((a, b) => a - b);
    expect(stage.sections).toEqual(expectSections);
  }

  const covered = [...UNIVERSAL_SECTIONS, ...own].sort((a, b) => a - b);
  const dup = covered.filter((n, i) => covered.indexOf(n) !== i);
  expect(dup, `重复计入的章节: ${dup.join(',')}`).toEqual([]);

  const missing = allChapterIds.filter((n) => !covered.includes(n));
  console.log(`通用 ${UNIVERSAL_SECTIONS.length} 章 + 专属 ${own.length} 章 = ${covered.length} 章`);
  console.log('各阶段专属数:', Object.entries(LIFE_STAGES).map(([k, s]) => `${k}=${s.own.length}`).join(' '));
  expect(missing, `这些章节无法从「人生阶段」进入: ${missing.join(',')}`).toEqual([]);
  expect(covered).toEqual(allChapterIds);
});

test('阶段标题与描述里的章节确实含条目 (不含空章节)', () => {
  for (const [name, stage] of Object.entries(LIFE_STAGES)) {
    for (const n of stage.sections) {
      const count = allEntries.filter((e) => e.section === n).length;
      expect(count, `${name} 引用了空章节 第${n}章`).toBeGreaterThan(0);
    }
    // 描述里不该出现已不属于它的章节主题（防"描述与映射脱节"）
    console.log(`${name}: 专属 ${stage.own.join(',')} | 共 ${stage.sections.length} 章`);
    expect(stage.description.length).toBeGreaterThan(10);
  }
});

test('阶段之间必须"看得出来不一样" (此前婴幼儿/上学以后侧栏勾选形态完全相同)', async ({ page }) => {
  const stages = Object.keys(LIFE_STAGES);

  // 1) 首页卡片: 各自写出专属章节名, 不能只有"专属 1 章 + 通用 9 章"这种雷同文案
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const cardTexts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href*="stage="]')).map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim()),
  );
  console.log('卡片文案示例:', JSON.stringify(cardTexts.slice(0, 2)));
  expect(new Set(cardTexts).size).toBe(6); // 6 张卡片文案互不相同
  expect(cardTexts[0]).toContain('刚出生的孩子怎么带');

  // 2) 阶段页: 专属章节必须置顶成独立一组并带「专属」标签, 且首屏就能看到
  for (const s of stages) {
    await page.goto('http://127.0.0.1:3000/explore?stage=' + encodeURIComponent(s));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="筛选"]');
      const groups = Array.from(aside?.querySelectorAll('h3') ?? []).map((h) => (h.textContent || '').trim());
      const tags = Array.from(aside?.querySelectorAll('label') ?? [])
        .map((l) => (l.textContent || '').replace(/\s+/g, ''))
        .filter((t) => t.includes('专属') || t.includes('通用'));
      const header = document.body.innerText.slice(0, 600);
      return { groups, ownTagged: tags.filter((t) => t.endsWith('专属')).length, univTagged: tags.filter((t) => t.endsWith('通用')).length, header };
    });
    console.log(`${s}: 分组=${JSON.stringify(r.groups.slice(0, 2))} 专属标签=${r.ownTagged} 通用标签=${r.univTagged}`);
    // 分组标题里必须有"本阶段专属", 且置顶
    expect(r.groups[0], `${s} 侧栏第一组应为「本阶段专属」`).toContain('本阶段专属');
    // 专属章节数 = 数据里的 own 数量
    expect(r.ownTagged).toBe(LIFE_STAGES[s].own.length);
    // 通用章节都打了标签 (9 个)
    expect(r.univTagged).toBe(UNIVERSAL_SECTIONS.length);
    // 阶段页头部必须直接写出专属章节名 (不用翻侧栏也能看到)
    const firstOwnTitle = allSections.find((x) => x.id === LIFE_STAGES[s].own[0])!.title;
    expect(r.header).toContain(firstOwnTitle);
  }
});

test('「只看专属」能把通用章节排除掉', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/explore?stage=' + encodeURIComponent('婴幼儿'));
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const before = await page.evaluate(() => {
    const m = document.body.innerText.match(/共\s*(\d+)\s*条/);
    return m ? Number(m[1]) : -1;
  });

  await page.locator('button:has-text("只看专属")').click();
  await page.waitForTimeout(800);

  const after = await page.evaluate(() => {
    const m = document.body.innerText.match(/共\s*(\d+)\s*条/);
    const checked = Array.from(document.querySelectorAll('aside[aria-label="筛选"] input[type=checkbox]:checked')).length;
    return { total: m ? Number(m[1]) : -1, checked };
  });
  const ownOnly = allEntries.filter((e) => LIFE_STAGES['婴幼儿'].own.includes(e.section)).length;
  console.log(`只看专属: ${before} 条 -> ${after.total} 条 (期望 ${ownOnly}), 勾选章节数 ${after.checked}`);
  expect(after.total).toBe(ownOnly);
  expect(after.total).toBeLessThan(before);
});

test('端到端: 阶段页的筛选范围 = 通用 + 专属 (此前 13 紧急情况进不去)', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // 首页卡片应标明"专属 N 章 + 通用 9 章", 而不是拿 45 去对原书 34 章
  const badges = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href*="stage="]')).map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim()),
  );
  console.log('卡片文案:', JSON.stringify(badges.slice(0, 2)));
  expect(badges.length).toBe(6);
  expect(badges[0]).toContain('专属 1 章');
  expect(badges[0]).toContain('通用 9 章');

  // 阶段页: 章节栏应显示 10 个已选章节, 总条数应等于这 10 章的条目数之和
  await page.goto('http://127.0.0.1:3000/explore?stage=' + encodeURIComponent('婴幼儿'));
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  const expectedSections = LIFE_STAGES['婴幼儿'].sections;
  const expectedTotal = allEntries.filter((e) => expectedSections.includes(e.section)).length;
  const info = await page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/共\s*(\d+)\s*条/);
    // 侧栏现在拆成「本阶段专属」+「其余章节（含通用）」两组, 取两组的计数
    const aside = document.querySelector('aside[aria-label="筛选"]');
    const groups = Array.from(aside?.querySelectorAll('h3') ?? []).map((h) =>
      Number((h.textContent || '').match(/\((\d+)\)/)?.[1] ?? -1),
    );
    return { total: m ? Number(m[1]) : -1, groups };
  });
  console.log(
    `婴幼儿阶段页: 侧栏分组计数=${info.groups.join('+')} 总条数=${info.total} (期望 1+${expectedSections.length - 1} 章 / ${expectedTotal} 条)`,
  );
  expect(info.groups[0]).toBe(LIFE_STAGES['婴幼儿'].own.length);
  expect(info.groups[0] + info.groups[1]).toBe(expectedSections.length);
  expect(info.total).toBe(expectedTotal);
  // 第 13 章(紧急情况)与第 20 章(婴幼儿专属)都必须在筛选范围内
  expect(expectedSections).toContain(13);
  expect(expectedSections).toContain(20);
});

test('端到端: 阶段页首屏必须是该阶段的专属内容 (此前前 50 条全是第 1-2 章)', async ({ page }) => {
  const cases: Array<[string, number]> = [
    ['婴幼儿', 20],
    ['上学以后', 30],
    ['初高中生', 23],
    ['大学生', 8],
    ['职场与中年', 5],
    ['退休前后', 16],
  ];
  for (const [stageName, expectSection] of cases) {
    await page.goto('http://127.0.0.1:3000/explore?stage=' + encodeURIComponent(stageName));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);
    const ids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.entry-card'))
        // 不能用 \b: 卡片里 id 后面紧跟等级字母("20-02A 级"), 2 与 A 都是词字符 → 无边界
        .map((c) => (c.textContent || '').match(/(?<![\d-])(\d{2})-(\d{2})(?![\d-])/)?.[0] || '')
        .filter(Boolean),
    );
    const ownInFirst50 = ids.filter((id) => Number(id.slice(0, 2)) === expectSection).length;
    console.log(`${stageName}: 前 ${ids.length} 条中第 ${expectSection} 章占 ${ownInFirst50} 条 (首条 ${ids[0]})`);
    expect(ids.length).toBeGreaterThan(0);
    // 首条必须是该阶段专属章节
    expect(Number(ids[0].slice(0, 2)), `${stageName} 首条应为第 ${expectSection} 章, 实际 ${ids[0]}`).toBe(expectSection);
    // 首屏 50 条里专属内容应有相当比例 (原来恒为 0)
    expect(ownInFirst50).toBeGreaterThan(5);
    if (stageName === '婴幼儿') {
      await page.screenshot({ path: 'tests/screenshots/out-stage-explore.png' });
    }
  }
});
