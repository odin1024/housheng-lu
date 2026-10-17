// 校准: 好问题 vs 离题问题的检索最高分, 用来定"是否只是字面相近"的阈值
//
// 直接在进程内调用 searchEntries —— 不走 HTTP, 因此不会触发 AI 调用:
//   · 毫秒级、零 token 成本 (原来 13 个 HTTP 请求在 AI 模式下每次都会真实调模型)
//   · 测试的本来就只是检索函数, 与 /api/ask 的路由行为无关
import { test, expect } from '@playwright/test';
import { searchEntries, MIN_RELEVANT_SCORE } from '../src/lib/search-index';

const GOOD = [
  '心脏骤停怎么办?',
  '低钠盐真的有用吗?',
  '租房押金不退怎么办?',
  '坐车要系安全带吗?',
  '孩子发烧 38.5 度要吃药吗?',
  '被骗了钱能追回吗?',
  '体检前要空腹多久?',
  '吸烟有什么危害?',
];
const OFF = ['怎么养一只猫?', '股票怎么选才能赚钱?', '量子力学是什么?', '推荐一部好看的电影', '怎么写一首诗?'];

test('校准: topScore 分布', () => {
  const probe = (q: string) => ({ q, top: searchEntries(q, 8)[0]?.score ?? 0 });

  const good = GOOD.map(probe).sort((a, b) => b.top - a.top);
  const off = OFF.map(probe).sort((a, b) => b.top - a.top);

  console.log('\n=== 好问题 ===');
  good.forEach((r) => console.log(`  ${r.top.toFixed(2).padStart(7)}  ${r.q}`));
  console.log('=== 离题问题 ===');
  off.forEach((r) => console.log(`  ${r.top.toFixed(2).padStart(7)}  ${r.q}`));

  const minGood = Math.min(...good.map((r) => r.top));
  const maxOff = Math.max(...off.map((r) => r.top));
  console.log(
    `\n阈值 ${MIN_RELEVANT_SCORE} | 好问题最低 ${minGood.toFixed(2)} | 离题最高 ${maxOff.toFixed(2)} | 分离度 ${(minGood / maxOff).toFixed(2)}x`,
  );

  // 回归守卫: 分词/加权改动后, 这些边界必须仍然成立
  // (否则 MIN_RELEVANT_SCORE=25 这套相关性判定就失效了)
  for (const r of good) {
    expect(r.top, `切题问题应不低于阈值: ${r.q}`).toBeGreaterThanOrEqual(MIN_RELEVANT_SCORE);
  }
  const trulyOff = off.filter((r) => ['怎么养一只猫?', '量子力学是什么?'].includes(r.q));
  for (const r of trulyOff) {
    expect(r.top, `真离题问题应归零: ${r.q}`).toBe(0);
  }
});
