import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { resolveProvider, UPSTREAM_TIMEOUT_MS, type Provider } from '@/lib/ask-provider';

/**
 * POST /api/ask/probe —— 测试连接 / 获取可用模型
 *
 * 为什么需要: 填地址 + key + 模型名时, 用户不知道到底通不通、模型名写没写对。
 * 让他在保存前就能验证一次, 比"提一个问题试试, 失败了再猜"友好得多。
 *
 * 安全: 与 /api/ask 完全同一套规则 ——
 *   · 自定义地址必须自带 key (否则会拿部署者的 key 去请求用户给的地址)
 *   · 地址过 ask-endpoint 校验 (协议/主机名/DNS, 挡 SSRF)
 *   · 同一限流桶
 */
export async function POST(req: NextRequest) {
  const limit = checkRateLimit(`probe:${clientKey(req)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: '请求过于频繁, 请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  // 先按 ask 的同一套规则校验地址 (含"必须自带 key"与 SSRF 检查)
  const { provider, rejectedBase } = await resolveProvider(req);
  if (rejectedBase) {
    return NextResponse.json({ ok: false, error: rejectedBase }, { status: 400 });
  }
  if (!provider) {
    return NextResponse.json(
      { ok: false, error: '本站未配置 AI, 且你也没有填自己的 key/地址' },
      { status: 400 },
    );
  }

  try {
    if (provider.kind === 'openai') {
      // 多数 OpenAI 兼容服务提供 /models; 先试它, 失败再用一次极小的对话验证 key
      const models = await listOpenAIModels(provider);
      if (models.length) {
        return NextResponse.json({ ok: true, models, note: '已获取模型列表' });
      }
      const chat = await probeOpenAIChat(provider);
      return chat;
    }
    const anthropic = await probeAnthropic(provider);
    return anthropic;
  } catch (e) {
    const name = e instanceof Error ? e.name : 'unknown';
    console.warn('[ask/probe] failed:', name);
    return NextResponse.json({ ok: false, error: `连接失败（${name}）` }, { status: 200 });
  }
}

/** GET {base}/models */
async function listOpenAIModels(provider: Provider): Promise<string[]> {
  try {
    const res = await fetch(`${provider.base}/models`, {
      headers: { Authorization: `Bearer ${provider.key}` },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    return (data.data || []).map((m) => m.id).filter((x): x is string => Boolean(x));
  } catch {
    return [];
  }
}

/** 一次 1-token 的最小对话, 用来确认 key 与模型可用 */
async function probeOpenAIChat(provider: Provider) {
  const res = await fetch(`${provider.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });
  if (res.ok) {
    return NextResponse.json({ ok: true, note: `连接成功（模型 ${provider.model} 可用）` });
  }
  // 只回状态码, 不落上游响应体
  const hint =
    res.status === 401 || res.status === 403
      ? 'key 无效或没有权限'
      : res.status === 404
        ? '地址或模型名不对（404）'
        : res.status === 429
          ? '上游限流或额度不足（429）'
          : `上游返回 ${res.status}`;
  return NextResponse.json({ ok: false, error: hint });
}

async function probeAnthropic(provider: Provider) {
  const res = await fetch(`${provider.base}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.key,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });
  if (res.ok) {
    return NextResponse.json({ ok: true, note: `连接成功（模型 ${provider.model} 可用）` });
  }
  const hint =
    res.status === 401
      ? 'key 无效'
      : res.status === 404
        ? '地址或模型名不对（404）'
        : `上游返回 ${res.status}`;
  return NextResponse.json({ ok: false, error: hint });
}
