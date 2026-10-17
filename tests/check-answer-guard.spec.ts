// 回答引用校验 (纯函数) + 接口一致性
import { test, expect } from '@playwright/test';
import { extractCitedIds, findUncitedIds } from '../src/lib/verify-answer';

const BASE = 'http://127.0.0.1:3000';

test('引用校验: 只抓 NN-NN 形态的条目编号', () => {
  expect(extractCitedIds('见第 13 节第 1 条（13-01），另见 13-02')).toEqual(['13-01', '13-02']);
  expect(extractCitedIds('重复引用 13-01 与 13-01 只算一次')).toEqual(['13-01']);
  expect(extractCitedIds('没有编号的正文')).toEqual([]);
  // 不该被误伤的数字: 电话/剂量/日期/小数
  expect(extractCitedIds('打 120, 压 5-6 厘米, 剂量 79.2%, 2026-09-20 起')).toEqual([]);
});

test('引用校验: 抓出编造编号', () => {
  const allowed = ['13-01', '13-02'];
  expect(findUncitedIds('依 13-01 与 13-02 处理', allowed)).toEqual([]);
  expect(findUncitedIds('依 13-01 与 31-99 处理', allowed)).toEqual(['31-99']);
  expect(findUncitedIds('见第 99 节第 3 条（99-03）', allowed)).toEqual(['99-03']);
});

test('/api/ask: 降级原因与正文/引用一致性 (按运行模式分别校验)', async ({ request }) => {
  const res = await request.post(BASE + '/api/ask', {
    data: { question: '心脏骤停怎么办?' },
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': `10.45.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 250) + 1}`,
    },
    timeout: 60_000,
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const listed = ((body.answer as string).match(/^\[\d+\]/gm) || []).length;

  // 所有引用 id 必须真实存在于原书 (两种模式都成立)
  const fs = await import('node:fs');
  const entries = JSON.parse(fs.readFileSync('data/entries.json', 'utf-8')) as Array<{ id: string }>;
  const ids = new Set(entries.map((e) => e.id));
  for (const c of body.citations) expect(ids.has(c.id)).toBe(true);
  // topScore 在任何模式下都必须返回 (前端据此判断 weakMatch)
  expect(typeof body.topScore).toBe('number');

  if (body.model === 'ai') {
    // AI 模式: 正文是散文, 不会逐条列举; 一致性改由"正文引用的编号 ⊆ 引用列表"保证(见 check-ai-path)
    console.log(`model=ai 引用=${body.citations.length} topScore=${body.topScore}`);
    expect(body.fallback).toBeFalsy();
    expect(String(body.answer).length).toBeGreaterThan(20);
  } else {
    // 纯检索模式: 正文逐条列举, 条数必须与引用列表一致
    console.log(`model=search-only reason=${body.fallbackReason} 引用=${body.citations.length} 正文列举=${listed}`);
    expect(body.fallbackReason).toBe('no-key');
    expect(listed).toBe(body.citations.length);
  }
});

test('/api/ask: 危及生命的问题要带上「急方」分步卡', async ({ request }) => {
  const ask = async (question: string) => {
    const res = await request.post(BASE + '/api/ask', {
      data: { question },
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': `10.46.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 250) + 1}`,
      },
    });
    return res.json();
  };

  // 命中: 场景名 / 口语别名 / 同义说法
  for (const q of ['心脏骤停怎么办?', '有人噎住了怎么办?', '一氧化碳中毒', '触电了怎么办']) {
    const body = await ask(q);
    const titles = (body.emergency || []).map((e: { title: string }) => e.title);
    console.log(`【${q}】急方命中: ${titles.join('/') || '(无)'}`);
    expect(titles.length).toBeGreaterThan(0);
    const first = body.emergency[0];
    expect(first.steps.length).toBe(4);
  }

  // 不该误命中
  for (const q of ['低钠盐真的有用吗?', '租房押金不退怎么办?', '孩子发烧 38.5 度要吃药吗?']) {
    const body = await ask(q);
    const titles = (body.emergency || []).map((e: { title: string }) => e.title);
    console.log(`【${q}】急方命中: ${titles.join('/') || '(无)'}`);
    expect((body.emergency || []).length).toBe(0);
  }
});
