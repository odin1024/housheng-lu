// 检索质量回归: 断言正确条目必须出现在前列
//
// 直接在进程内调用 searchEntries —— 不走 HTTP, 因此**不触发 AI 调用**:
// 测的本来就是检索质量, 与是否配置了 AI 上游无关; 这样毫秒级完成且零 token 成本。
// (路由层是否把检索结果正确映射成 citations, 由 check-ask-page 覆盖)
import { test, expect } from '@playwright/test';
import { searchEntries } from '../src/lib/search-index';

interface Case {
  q: string;
  /** topN 里必须出现的条目 id */
  mustInclude: string[];
  topN: number;
  /** 可选的 top1 断言 */
  top1?: string;
}

const CASES: Case[] = [
  { q: '心脏骤停怎么办?', mustInclude: ['13-01'], topN: 1, top1: '13-01' },
  { q: '被骗了钱能追回吗?', mustInclude: ['08-02', '08-12', '08-22'], topN: 3 },
  { q: '体检前要空腹多久?', mustInclude: ['06-18', '01-08', '24-07'], topN: 3 },
  { q: '低钠盐真的有用吗?', mustInclude: ['02-09'], topN: 1, top1: '02-09' },
  { q: '租房押金不退怎么办?', mustInclude: ['15-01', '15-03'], topN: 3 },
  { q: '孩子发烧 38.5 度要吃药吗?', mustInclude: ['20-08', '34-02', '13-16'], topN: 3 },
  { q: '坐车要系安全带吗?', mustInclude: ['01-01'], topN: 2 },
  { q: '吸烟有什么危害?', mustInclude: ['01-24', '02-01', '02-02', '02-03', '02-04', '27-04'], topN: 5 },
];

test('检索质量: 正确条目必须排在前面', () => {
  const failures: string[] = [];

  for (const c of CASES) {
    const ids = searchEntries(c.q, 8).map((r) => r.entry.id);
    const top = ids.slice(0, c.topN);
    const ok = c.mustInclude.some((id) => top.includes(id));

    console.log(`\n【${c.q}】top${c.topN}=${top.join(' ')} ${ok ? '✅' : '❌'}`);
    if (c.top1 && ids[0] !== c.top1) {
      console.log(`   ❌ top1 期望 ${c.top1}, 实际 ${ids[0]}`);
      failures.push(`${c.q}: top1=${ids[0]} 期望 ${c.top1}`);
    }
    if (!ok) failures.push(`${c.q}: top${c.topN} 未命中 ${c.mustInclude.join('/')} (实际 ${top.join(' ')})`);
  }

  if (failures.length) console.log('\n未通过:', JSON.stringify(failures, null, 1));
  expect(failures).toEqual([]);
});
