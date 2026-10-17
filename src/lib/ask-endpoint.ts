import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

/**
 * 自定义 API 地址的安全校验 (纯函数 + DNS 复核, 服务端专用)
 *
 * 为什么需要它: 想让"自建/公开部署"都支持用户填自己的中转站地址, 就必须防住两件事 ——
 *   1. **密钥外泄**: 若允许"服务端 key + 用户填的地址", 攻击者只要把地址指向自己的服务器,
 *      我们就会带着服务端的 key 去请求它 → key 直接泄漏。所以规则是:
 *      **自定义地址必须配用户自己的 key**(见 route.ts), 这条由调用方保证。
 *   2. **SSRF**: 用户把地址填成内网/本机/云元数据地址, 借我们的服务器去读内网。
 *      这里做三层拦截: 协议白名单 → 主机名字面检查 → DNS 解析后再复核一次 IP。
 *
 * 残留风险(如实标注): DNS 重绑定(DNS rebinding)理论上仍可在"校验通过"与"真正发起请求"
 * 之间的窗口把域名改指内网。要彻底消除需把连接钉在已解析的 IP 上(会明显复杂化 TLS/SNI),
 * 本项目按"用户必须自带 key、且请求只返回模型回答文本"的风险级别, 采用上述比例适当的防护。
 */

export type BaseCheck = { ok: true; url: string } | { ok: false; reason: string };

/** 解析 IPv4 点分/十进制/八进制/十六进制写法为 number, 失败返回 null */
function ipv4ToInt(host: string): number | null {
  // 统一处理 0x7f.1 / 0177.0.0.1 / 2130706433 这类花式写法
  const parts = host.split('.');
  if (parts.length === 1) {
    // 单个十进制整数形式
    if (!/^\d+$/.test(parts[0])) return null;
    const n = Number(parts[0]);
    return Number.isInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
  }
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    let v: number;
    if (/^0x[0-9a-f]+$/i.test(p)) v = parseInt(p, 16);
    else if (/^0[0-7]+$/.test(p)) v = parseInt(p, 8);
    else if (/^\d+$/.test(p)) v = Number(p);
    else return null;
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    out = out * 256 + v;
  }
  return out;
}

const PRIVATE_V4: Array<[number, number]> = [
  [0x00000000, 0xff000000], // 0.0.0.0/8
  [0x0a000000, 0xff000000], // 10/8
  [0x64400000, 0xffc00000], // 100.64/10 CGNAT
  [0x7f000000, 0xff000000], // 127/8 loopback
  [0xa9fe0000, 0xffff0000], // 169.254/16 link-local (含云元数据 169.254.169.254)
  [0xac100000, 0xfff00000], // 172.16/12
  [0xc0a80000, 0xffff0000], // 192.168/16
  [0xc0000000, 0xffffff00], // 192.0.0/24
  [0xc6120000, 0xfffe0000], // 198.18/15 benchmark
  [0xe0000000, 0xf0000000], // 224/4 multicast
  [0xf0000000, 0xf0000000], // 240/4 reserved
];

function isPrivateV4(host: string): boolean {
  const n = ipv4ToInt(host);
  if (n === null) return false;
  return PRIVATE_V4.some(([net, mask]) => (n & mask) >>> 0 === (net & mask) >>> 0);
}

/** IPv6 私有/保留段 (含 IPv4 映射地址) */
function isPrivateV6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === '::' || h === '::1') return true;
  if (h.startsWith('fe80')) return true; // link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // ULA
  if (h.startsWith('ff')) return true; // multicast
  // ::ffff:127.0.0.1 形式
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return false;
}

/** 明显不该被请求的主机名 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const kind = isIP(h);
  if (kind === 4) return isPrivateV4(h);
  if (kind === 6) return isPrivateV6(h);
  // 非标准写法的 IP 字面量 (十进制/八进制/十六进制)
  if (/^[0-9a-fx.]+$/i.test(h) && ipv4ToInt(h) !== null) return isPrivateV4(h);
  return false;
}

/** 同步检查: 协议 + 主机名 (不含 DNS 解析) */
export function parseCustomBase(raw: string): BaseCheck {
  const value = raw.trim();
  if (!value) return { ok: false, reason: '地址为空' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: '地址格式不合法（需形如 https://api.example.com/v1）' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: '只支持 http/https 地址' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: '地址里不要带用户名/密码' };
  }
  const host = url.hostname;
  if (isBlockedHost(host)) {
    return { ok: false, reason: '不允许指向本机/内网/云元数据地址' };
  }
  if (isIP(host) === 0 && !host.includes('.')) {
    return { ok: false, reason: '主机名需为公网域名（不能是单段内网主机名）' };
  }
  return { ok: true, url: value.replace(/\/+$/, '') };
}

/** 完整检查: 同步检查 + DNS 复核 (解析出的任一 IP 属内网即拒绝) */
export async function validateCustomBase(raw: string): Promise<BaseCheck> {
  const parsed = parseCustomBase(raw);
  if (!parsed.ok) return parsed;

  const host = new URL(parsed.url).hostname;
  if (isIP(host) !== 0) return parsed; // IP 字面量已在 parseCustomBase 里查过

  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.some((a) => isBlockedHost(a.address))) {
      return { ok: false, reason: '该域名解析到内网地址, 已拒绝' };
    }
  } catch {
    return { ok: false, reason: '域名无法解析' };
  }
  return parsed;
}
