// 核对页面承诺: 原书没覆盖的问题, 是否真的标注"原书未覆盖"
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

/** 真·离题 (原书确实不覆盖) */
const OFF_TOPIC = ['怎么养一只猫?', '量子力学是什么?', '怎么写一首诗?'];
/** 真·切题 (原书确实覆盖) —— 不能被误判为"未覆盖" */
const ON_TOPIC = ['心脏骤停怎么办?', '被骗了钱能追回吗?', '低钠盐真的有用吗?'];

const ask = async (request: import('@playwright/test').APIRequestContext, q: string) => {
  const res = await request.post(BASE + '/api/ask', {
    data: { question: q },
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': `10.47.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 250) + 1}`,
    },
  });
  return res.json();
};

test('离题问题: 必须标注"原书未直接覆盖"', async ({ request }) => {
  for (const q of OFF_TOPIC) {
    const body = await ask(request, q);
    const marked = String(body.answer).includes('原书未直接覆盖') || String(body.answer).includes('原书未覆盖');
    console.log(
      `【${q}】topScore=${Number(body.topScore).toFixed(1)} weak=${body.weakMatch} 引用=${(body.citations || []).length} 标注=${marked ? '✅' : '❌'}`,
    );
    expect(marked, `${q} 应标注未覆盖`).toBe(true);
    expect(body.weakMatch).toBe(true);
  }
});

test('切题问题: 不得误标"未覆盖"', async ({ request }) => {
  for (const q of ON_TOPIC) {
    const body = await ask(request, q);
    // 以**结构化信号** weakMatch 判定; 不能拿回答正文里是否出现"原书未覆盖"来判断 ——
    // AI 模式下一段好回答也可能对"其中某一部分"诚实地说"原书未覆盖"(实测租房押金那条)
    console.log(
      `【${q}】topScore=${Number(body.topScore).toFixed(1)} weak=${body.weakMatch} 引用=${(body.citations || []).length}`,
    );
    expect(body.weakMatch, `${q} 不该被标为字面相近`).toBe(false);
    expect((body.citations || []).length).toBeGreaterThan(0);
  }
});

