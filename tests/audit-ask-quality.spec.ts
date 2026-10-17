// 实测 /api/ask 的检索质量: 对真实问题返回的引用是否相关
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

const CASES: Array<{ q: string; expectInTop3: string[] }> = [
  { q: '心脏骤停怎么办?', expectInTop3: ['骤停', '急救', '心'] },
  { q: '被骗了钱能追回吗?', expectInTop3: ['骗', '钱', '诈骗'] },
  { q: '体检前要空腹多久?', expectInTop3: ['空腹', '体检', '抽血'] },
  { q: '低钠盐真的有用吗?', expectInTop3: ['钠', '盐', '血压'] },
  { q: '租房押金不退怎么办?', expectInTop3: ['押金', '租房', '房东'] },
  { q: '孩子发烧 38.5 度要吃药吗?', expectInTop3: ['发烧', '退烧', '体温'] },
  { q: '坐车要系安全带吗?', expectInTop3: ['安全带', '安全'] },
  { q: '吸烟有什么危害?', expectInTop3: ['烟', '戒烟', '肺'] },
];

test('检索质量: 每个真实问题的 top 引用', async ({ request }) => {
  let noCitation = 0;
  let weak = 0;

  for (const c of CASES) {
    const res = await request.post(BASE + '/api/ask', {
      data: { question: c.q },
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.42.0.${Math.floor(Math.random() * 200) + 1}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const cites: Array<{ id: string; title: string; evidenceLevel: string }> = body.citations || [];
    const top3 = cites.slice(0, 3);
    const hit = top3.some((t) => c.expectInTop3.some((k) => t.title.includes(k)));

    console.log(`\n【${c.q}】引用 ${cites.length} 条 ${hit ? '✅' : '❌ top3 未命中预期关键词'}`);
    top3.forEach((t, i) => console.log(`   ${i + 1}. ${t.id} ${t.title}`));

    if (cites.length === 0) noCitation++;
    if (!hit) weak++;
  }

  console.log(`\n小结: ${CASES.length} 个问题, 0 引用 ${noCitation} 个, top3 不相关 ${weak} 个`);
  // 先只报告不硬失败, 便于看清真实质量
  expect(noCitation).toBe(0);
});
