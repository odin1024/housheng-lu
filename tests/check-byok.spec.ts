// 「clone 下来怎么配 key」的验证: 公开配置端点 + 访问者自带 key (BYOK) + SSRF 边界
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';

const ip = () => `10.70.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 250) + 1}`;

const post = (
  request: import('@playwright/test').APIRequestContext,
  question: string,
  headers: Record<string, string> = {},
) =>
  request.post(BASE + '/api/ask', {
    data: { question },
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip(), ...headers },
    timeout: 60_000,
  });

test('公开配置: 页面据此显示 AI 设置入口', async ({ request }) => {
  const body = await (await request.get(BASE + '/api/ask')).json();
  console.log('config:', JSON.stringify(body.ai));
  expect(body.ai).toBeTruthy();
  expect(typeof body.ai.baseConfigured).toBe('boolean');
  expect(typeof body.ai.byok).toBe('boolean');
  expect(Array.isArray(body.ai.models)).toBe(true);
  expect(body.ai.models.length).toBeGreaterThan(0);
  // 绝不能回传密钥本身
  expect(JSON.stringify(body)).not.toMatch(/sk-[A-Za-z0-9]{10,}/);
});

test('BYOK: 自带 key 会被真正使用 (假 key → 上游失败而非"未配置")', async ({ request }) => {
  const cfg = await (await request.get(BASE + '/api/ask')).json();
  test.skip(!cfg.ai.byok, '本站未配置 ASK_API_BASE, 无法使用自带 key');

  // 假 key: 形状合法 → 服务端会拿它去请求上游 → 必然失败 → 降级原因应是 upstream(而不是 no-key)
  const res = await post(request, '低钠盐真的有用吗?', { 'x-ask-key': 'sk-definitely-not-a-real-key-000' });
  expect(res.status()).toBe(200);
  const body = await res.json();
  console.log(`假 key: model=${body.model} reason=${body.fallbackReason} 引用=${body.citations.length}`);
  expect(body.model).toBe('search-only');
  expect(body.fallbackReason).toBe('upstream'); // 证明走的是"用户给的 key"这条路
  expect(body.citations.length).toBeGreaterThan(0); // 降级后仍有检索结果
  // 绝不能把 key 回显给客户端
  expect(JSON.stringify(body)).not.toContain('sk-definitely-not-a-real-key');
});

test('BYOK: 形状非法的 key 被忽略 (回落到服务端配置)', async ({ request }) => {
  const cfg = await (await request.get(BASE + '/api/ask')).json();
  test.skip(!cfg.ai.serverKey, '本站未配置服务端 key, 无法验证回落');

  // 注意: 非 ASCII 的 key 无法作为 HTTP 头发送 —— 浏览器与 undici 都会直接抛
  // "Invalid character in header content"，所以那条分支在 HTTP 层就进不来(服务端仍保留该
  // 检查作为纵深防御, 防的是 curl / python-requests 这类更宽松的客户端)。
  for (const bad of ['abc', 'has space in it', 'x'.repeat(300)]) {
    const res = await post(request, '低钠盐真的有用吗?', { 'x-ask-key': bad });
    const body = await res.json();
    console.log(`非法 key "${bad.slice(0, 20)}" → model=${body.model} reason=${body.fallbackReason ?? '-'}`);
    // 被忽略 → 用服务端 key → 正常出 AI 回答
    expect(body.model).toBe('ai');
    expect(body.fallback).toBeFalsy();
  }
});

test('BYOK: 不接受前端自定义 base URL (挡 SSRF)', async ({ request }) => {
  // 攻击者试图让本站服务器去请求内网/元数据地址: 该头必须被无视, 仍走服务端配置的地址
  const res = await post(request, '低钠盐真的有用吗?', {
    'x-ask-base': 'http://169.254.169.254/latest/meta-data',
    'x-ask-url': 'http://127.0.0.1:6379',
  });
  const body = await res.json();
  console.log(`带 x-ask-base 的请求: model=${body.model} reason=${body.fallbackReason ?? '-'}`);
  // 若被当作 base 使用, 会因连不上而降级; 正常出 AI 回答即证明该头被忽略
  expect(body.model).toBe('ai');
  expect(body.fallback).toBeFalsy();
});

test('BYOK: 模型必须在服务端白名单内', async ({ request }) => {
  const cfg = await (await request.get(BASE + '/api/ask')).json();
  test.skip(!cfg.ai.serverKey, '本站未配置服务端 key');

  const res = await post(request, '低钠盐真的有用吗?', { 'x-ask-model': 'some-model-not-in-allowlist' });
  const body = await res.json();
  console.log(`非法模型 → model=${body.model} reason=${body.fallbackReason ?? '-'}`);
  // 非法模型被忽略 → 用默认模型 → 仍然成功
  expect(body.model).toBe('ai');
});

test('自定义地址: 必须自带 key 才会被使用 (禁止"服务端 key + 用户地址")', async ({ request }) => {
  const cfg = await (await request.get(BASE + '/api/ask')).json();
  test.skip(!cfg.ai.customBase, '本站已关闭自定义地址 (ASK_ALLOW_CUSTOM_BASE=0)');
  test.skip(!cfg.ai.serverKey, '本站未配置服务端 key, 无法验证该回落');

  // 危险组合: 用户给了地址但没给 key → 绝不能用服务端 key 去请求它 (否则攻击者可偷 key)
  const res = await post(request, '低钠盐真的有用吗?', {
    'x-ask-base': 'https://api.example.com/v1',
  });
  const body = await res.json();
  console.log(`无 key + 自定义地址: model=${body.model} baseIgnored=${body.baseIgnored ?? '-'}`);
  expect(body.baseIgnored).toBeTruthy();
  expect(body.baseIgnored).toContain('key');
  // 地址被忽略 → 回落服务端配置 → 仍然正常出 AI 回答
  expect(body.model).toBe('ai');
});

test('自定义地址: 指向内网/元数据一律拒绝', async ({ request }) => {
  const cfg = await (await request.get(BASE + '/api/ask')).json();
  test.skip(!cfg.ai.customBase, '本站已关闭自定义地址');

  for (const bad of ['http://169.254.169.254/latest/meta-data', 'http://127.0.0.1:3000/v1', 'http://localhost:8080/v1']) {
    const res = await post(request, '低钠盐真的有用吗?', {
      'x-ask-key': 'sk-my-own-test-key-123456',
      'x-ask-base': bad,
    });
    const body = await res.json();
    console.log(`${bad} → baseIgnored=${body.baseIgnored ?? '-'} model=${body.model}`);
    expect(body.baseIgnored).toBeTruthy();
    // 未被使用 → 回落服务端配置(自带 key 也仍可用于服务端地址) → 正常出 AI 回答
    expect(body.model).toBe('ai');
  }
});

test('自定义地址: 公网地址 + 自带 key 会被真正使用', async ({ request }) => {
  const cfg = await (await request.get(BASE + '/api/ask')).json();
  test.skip(!cfg.ai.customBase, '本站已关闭自定义地址');

  // example.com 是真实可解析的公网域名(会 404/拒绝) → 证明请求确实发往了用户给的地址:
  // 若被忽略而回落服务端地址, 我们会拿到 model=ai 的正常回答
  const res = await post(request, '低钠盐真的有用吗?', {
    'x-ask-key': 'sk-my-own-test-key-123456',
    'x-ask-base': 'https://example.com/v1',
    'x-ask-model': 'some-model-of-my-own-provider',
  });
  const body = await res.json();
  console.log(`公网自定义地址: model=${body.model} reason=${body.fallbackReason ?? '-'} baseIgnored=${body.baseIgnored ?? '-'}`);
  expect(body.baseIgnored).toBeFalsy(); // 地址没被拒绝
  expect(body.model).toBe('search-only'); // 请求发到了自定义地址并失败
  expect(body.fallbackReason).toBe('upstream');
});

test('测试连接: 用本站默认配置能取到模型列表', async ({ request }) => {
  const cfg = await (await request.get(BASE + '/api/ask')).json();
  test.skip(!cfg.ai.serverKey, '本站未配置服务端 key');

  const res = await request.post(BASE + '/api/ask/probe', {
    headers: { 'CF-Connecting-IP': ip() },
    timeout: 45_000,
  });
  const body = await res.json();
  console.log(`probe(本站默认): ok=${body.ok} note=${body.note ?? body.error} models=${(body.models || []).length}`);
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.models)).toBe(true);
  expect(body.models.length).toBeGreaterThan(0);
});

test('测试连接: 遵守同一套安全规则', async ({ request }) => {
  // 自定义地址但没带 key → 必须拒绝 (与提问接口一致)
  const noKey = await request.post(BASE + '/api/ask/probe', {
    headers: { 'CF-Connecting-IP': ip(), 'x-ask-base': 'https://example.com/v1' },
  });
  const b1 = await noKey.json();
  console.log(`probe(有地址无 key): ok=${b1.ok} error=${b1.error}`);
  expect(b1.ok).toBe(false);
  expect(b1.error).toContain('key');

  // 内网地址 → 必须拒绝
  const internal = await request.post(BASE + '/api/ask/probe', {
    headers: {
      'CF-Connecting-IP': ip(),
      'x-ask-key': 'sk-my-own-test-key-123456',
      'x-ask-base': 'http://169.254.169.254/latest/meta-data',
    },
  });
  const b2 = await internal.json();
  console.log(`probe(内网地址): ok=${b2.ok} error=${b2.error}`);
  expect(b2.ok).toBe(false);
  expect(b2.error).toContain('内网');

  // 假 key + 公网地址 → 连接失败, 但要给出可读原因 (而不是静默)
  const badKey = await request.post(BASE + '/api/ask/probe', {
    headers: {
      'CF-Connecting-IP': ip(),
      'x-ask-key': 'sk-my-own-test-key-123456',
      'x-ask-base': 'https://example.com/v1',
    },
    timeout: 45_000,
  });
  const b3 = await badKey.json();
  console.log(`probe(公网地址+假 key): ok=${b3.ok} error=${b3.error ?? b3.note}`);
  expect(b3.ok).toBe(false);
  expect(typeof b3.error).toBe('string');
});

test('BYOK 页面入口: 能填、能存、能清, 且 key 只走请求头', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto(BASE + '/ask');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // 入口存在且状态可见 (此前页面完全没有设置入口)
  const toggle = page.locator('button:has-text("AI 设置")');
  await expect(toggle).toBeVisible();
  console.log('设置入口文案:', (await toggle.innerText()).trim());
  await toggle.click();

  const keyInput = page.locator('#ask-key');
  await expect(keyInput).toBeVisible();
  await expect(keyInput).toHaveAttribute('type', 'password'); // 不明文显示

  // 保存 → 落到 localStorage, 状态文案变为"用你自己的 key"
  await keyInput.fill('sk-my-own-test-key-123456');
  await page.locator('button:has-text("保存到本机")').click();
  await page.waitForTimeout(300);
  const stored = await page.evaluate(() => localStorage.getItem('housheng-lu:ask-key:v1'));
  console.log('localStorage:', stored);
  expect(stored).toBe('sk-my-own-test-key-123456');
  await expect(page.locator('button:has-text("AI 设置")')).toContainText('用你自己的 key');

  // 关键: key 必须走请求头, 不能出现在 URL 或请求体里
  let seen: { url: string; header?: string; body?: string } | null = null;
  await page.route('**/api/ask', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      seen = {
        url: req.url(),
        header: req.headers()['x-ask-key'],
        body: req.postData() || '',
      };
    }
    await route.continue();
  });
  await page.fill('#q-input', '低钠盐真的有用吗?');
  await page.locator('button:has-text("问 卷")').click();
  await page.locator('[data-testid="ask-result"]').waitFor({ timeout: 60_000 });
  console.log('请求 URL:', seen!.url);
  console.log('x-ask-key 头:', seen!.header);
  expect(seen!.header).toBe('sk-my-own-test-key-123456');
  expect(seen!.url).not.toContain('sk-my-own-test-key');
  expect(seen!.body).not.toContain('sk-my-own-test-key');

  // 清除 (面板此前一直是打开的, 不要再点 toggle —— 那会把它关掉)
  if (!(await page.locator('#ask-settings').isVisible())) {
    await page.locator('button:has-text("AI 设置")').click();
  }
  await page.locator('#ask-settings button:has-text("清除")').click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => localStorage.getItem('housheng-lu:ask-key:v1'));
  console.log('清除后 localStorage:', after);
  expect(after).toBeNull();
});
