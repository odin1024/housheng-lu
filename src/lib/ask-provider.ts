import type { NextRequest } from 'next/server';
import { validateCustomBase } from './ask-endpoint';

/**
 * AI 上游解析 (服务端专用, /api/ask 与 /api/ask/probe 共用)
 *
 * 支持的两种协议:
 *   openai    → {base}/chat/completions, Authorization: Bearer
 *   anthropic → {base}/messages, x-api-key + anthropic-version
 *
 * 安全规则 (不可绕过):
 *   1. 用户自带地址时**必须自带 key** —— 否则会拿部署者的 key 去请求用户给的地址, key 直接泄漏
 *   2. 自带地址必须通过 ask-endpoint 的协议/主机名/DNS 校验 (挡 SSRF)
 *   3. 部署者可设 ASK_ALLOW_CUSTOM_BASE=0 彻底关闭自定义地址
 */
export type Provider = {
  kind: 'openai' | 'anthropic';
  base: string;
  key: string;
  model: string;
  byok: boolean;
  customBase: boolean;
};

export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
export const DEFAULT_OPENAI_MODEL = 'deepseek-v4.1-flash';
export const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
export const UPSTREAM_TIMEOUT_MS = 30_000;

/** 允许的模型白名单 (只对"服务端地址"生效): 逗号分隔的 ASK_MODELS */
export function allowedModels(): string[] {
  const list = (process.env.ASK_MODELS || process.env.ASK_MODEL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? [...new Set(list)] : [];
}

export function customBaseAllowed(): boolean {
  return process.env.ASK_ALLOW_CUSTOM_BASE !== '0';
}

export function defaultModel(kind: 'openai' | 'anthropic'): string {
  if (kind === 'anthropic') return process.env.ASK_MODEL || DEFAULT_ANTHROPIC_MODEL;
  return process.env.ASK_MODEL || DEFAULT_OPENAI_MODEL;
}

/** 自带 key 的形状校验: 可打印 ASCII、无空白、8-200 字符 */
export function byokKey(req: NextRequest): string | null {
  const raw = (req.headers.get('x-ask-key') || '').trim();
  if (!raw) return null;
  if (raw.length < 8 || raw.length > 200) return null;
  if (/\s/.test(raw) || /[^\x21-\x7e]/.test(raw)) return null;
  return raw;
}

/** 服务端地址下, 模型必须在白名单内 */
function byokModel(req: NextRequest): string | null {
  const raw = (req.headers.get('x-ask-model') || '').trim();
  if (!raw) return null;
  return allowedModels().includes(raw) ? raw : null;
}

/** 需要的回答上限 (用户可调; 推理模型给太少会出现正文为空) */
export function resolveMaxTokens(req: NextRequest): number {
  const raw = Number(req.headers.get('x-ask-max-tokens') || 0);
  if (Number.isInteger(raw) && raw >= 100 && raw <= 4000) return raw;
  const env = Number(process.env.ASK_MAX_TOKENS || 0);
  if (Number.isInteger(env) && env >= 100 && env <= 4000) return env;
  return 1500;
}

/** 请求的协议 (默认 openai) */
export function requestProtocol(req: NextRequest): 'openai' | 'anthropic' {
  return (req.headers.get('x-ask-protocol') || 'openai').trim() === 'anthropic' ? 'anthropic' : 'openai';
}

/** 服务端 env 配置 (base 只能是部署者设的) */
function envProvider(userKey: string | null, userModel: string | null): Provider | null {
  const base = process.env.ASK_API_BASE;
  if (base) {
    const key = userKey || process.env.ASK_API_KEY;
    if (!key) return null;
    return {
      kind: 'openai',
      base: base.replace(/\/+$/, ''),
      key,
      model: userModel || defaultModel('openai'),
      byok: Boolean(userKey),
      customBase: false,
    };
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return {
      kind: 'anthropic',
      base: ANTHROPIC_BASE,
      key: anthropicKey,
      model: defaultModel('anthropic'),
      byok: false,
      customBase: false,
    };
  }
  return null;
}

export async function resolveProvider(
  req: NextRequest,
): Promise<{ provider: Provider | null; rejectedBase?: string }> {
  const userKey = byokKey(req);
  const rawBase = (req.headers.get('x-ask-base') || '').trim();
  const protocol = requestProtocol(req);

  if (rawBase && customBaseAllowed()) {
    if (!userKey) {
      // 关键安全分支: 绝不能用服务端的 key 去请求用户给的地址
      return { provider: envProvider(null, null), rejectedBase: '未提供自己的 key 时不能自定义地址' };
    }
    const check = await validateCustomBase(rawBase);
    if (!check.ok) {
      return { provider: envProvider(null, null), rejectedBase: check.reason };
    }
    // 自定义地址时不能用服务端的模型白名单 —— 对方是别的厂商/中转站, 模型名无从预知
    const rawModel = (req.headers.get('x-ask-model') || '').trim();
    const customModel = /^[A-Za-z0-9._:\-]{2,64}$/.test(rawModel) ? rawModel : '';
    return {
      provider: {
        kind: protocol,
        base: check.url,
        key: userKey,
        model: customModel || defaultModel(protocol),
        byok: true,
        customBase: true,
      },
    };
  }

  return { provider: envProvider(userKey, byokModel(req)) };
}

/** 调用上游取正文; 只取 content, 不把推理过程当答案 */
export async function callProvider(
  provider: Provider,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  if (provider.kind === 'anthropic') {
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
        max_tokens: maxTokens,
        temperature: 0.3,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      console.warn('[ask] upstream error:', res.status);
      return '';
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return (data.content?.[0]?.text || '').trim();
  }

  const res = await fetch(`${provider.base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.key}`,
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    body: JSON.stringify({
      model: provider.model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    // 只记状态码, 不落上游响应体/用户问题原文 (日志脱敏)
    console.warn('[ask] upstream error:', res.status);
    return '';
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  if (data.usage) {
    console.log(
      `[ask] usage prompt=${data.usage.prompt_tokens ?? '?'} completion=${data.usage.completion_tokens ?? '?'} total=${data.usage.total_tokens ?? '?'}`,
    );
  }
  return (data.choices?.[0]?.message?.content || '').trim();
}
