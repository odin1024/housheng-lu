// AI 路径端到端回归 (配了 ASK_API_BASE 后才有意义)
// 注意: 每个问题会真实调用上游模型, 消耗 token 且约 10 秒/题
import { test, expect } from '@playwright/test';
import { extractCitedIds } from '../src/lib/verify-answer';

const BASE = 'http://127.0.0.1:3000';

const CASES = [
  { q: '心脏骤停怎么办?', expectEmergency: true },
  { q: '低钠盐真的有用吗?', expectEmergency: false },
  { q: '租房押金不退怎么办?', expectEmergency: false },
];

test('AI 路径: 回答中的引用必须全部来自检索到的条目', async ({ request }) => {
  test.setTimeout(180_000);

  const ask = (question: string) =>
    request.post(BASE + '/api/ask', {
      data: { question },
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': `10.62.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 250) + 1}`,
      },
      timeout: 60_000,
    });

  // 是否走 AI 由**服务端**决定 (Playwright 进程不加载 .env.local, 不能靠 runner 的环境变量判断)
  const probe = await (await ask('低钠盐真的有用吗?')).json();
  test.skip(probe.model !== 'ai', `服务端处于纯检索模式 (model=${probe.model}), 跳过 AI 路径用例`);

  for (const c of CASES) {
    const res = await ask(c.q);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const ids = (body.citations || []).map((x: { id: string }) => x.id);
    const cited = extractCitedIds(String(body.answer));
    const bogus = cited.filter((id) => !ids.includes(id));

    console.log(
      `\n【${c.q}】model=${body.model} fallback=${body.fallback ?? '-'} 引用=${ids.length} 正文引用=${cited.length} 编造=${bogus.length}`,
    );
    console.log(`   条目: ${ids.slice(0, 5).join(' ')}`);

    // 走的是 AI 路径, 且没有被降级
    expect(body.model).toBe('ai');
    expect(body.fallback).toBeFalsy();
    // 反编造保证: 正文引用的编号必须都在检索结果里
    // (服务端本来就会拦截编造并降级, 所以能拿到 model=ai 就说明校验通过了)
    expect(bogus).toEqual([]);
    // 急救类问题必须带出急方卡
    if (c.expectEmergency) {
      expect((body.emergency || []).length).toBeGreaterThan(0);
    }
    // 回答必须带免责声明
    expect(String(body.answer)).toContain('专业机构');
    // 不得把推理过程当答案外泄
    expect(String(body.answer)).not.toContain('reasoning_content');
  }
});
