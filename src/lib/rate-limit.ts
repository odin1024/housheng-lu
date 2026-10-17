/**
 * 极简固定窗口限流 (进程内存)
 *
 * 用途: /api/ask 是无鉴权接口, 且成功后会产生**真实费用**(调用 Claude API),
 * 必须限流, 否则可被脚本刷爆额度。
 *
 * 已知局限 (诚实说明):
 *  - 计数存在单进程内存里, 多实例 / Serverless 多冷启动之间**不共享** → 只能挡住单实例内的滥用
 *  - 生产环境应换成持久化方案 (Cloudflare KV / Durable Objects / Upstash Redis)
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_KEYS = 5000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  max = MAX_REQUESTS,
  windowMs = WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);

  // 防止 Map 无限增长: 超过上限时清掉窗口内已无记录的 key
  if (hits.size > MAX_KEYS) {
    for (const [k, v] of hits) {
      if (v.length === 0 || now - v[v.length - 1] > windowMs) hits.delete(k);
    }
  }

  return { allowed: true, remaining: Math.max(0, max - recent.length), retryAfterSec: 0 };
}

/** 取客户端 IP (Cloudflare / 反向代理场景优先用 CF-Connecting-IP) */
export function clientKey(req: Request): string {
  const h = req.headers;
  const ip =
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown';
  return ip;
}
