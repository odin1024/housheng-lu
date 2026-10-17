import { NextRequest, NextResponse } from 'next/server';
import { searchEntries, buildPrompt, MIN_RELEVANT_SCORE } from '@/lib/search-index';
import { allEntries, stats } from '@/lib/entries';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { findUncitedIds } from '@/lib/verify-answer';
import { matchEmergencyScenarios } from '@/lib/emergency-match';
import {
  resolveProvider,
  callProvider,
  resolveMaxTokens,
  allowedModels,
  customBaseAllowed,
  defaultModel,
} from '@/lib/ask-provider';

/**
 * POST /api/ask
 * body: { question: string }
 * 返回: { answer: string, citations: Array<{id, section, number, title, evidenceLevel}> }
 *
 * AI 模型:
 *  - 如果设置了 ANTHROPIC_API_KEY -> 用 Claude API (模型可用 ASK_MODEL 覆盖)
 *  - 否则 -> 返回带引用的纯检索结果 (不编造)
 *
 * 防护: 限流 (10 次/分钟/IP) + 请求体大小上限 + 上游超时, 避免无鉴权接口被刷爆付费额度
 */

const MAX_BODY_BYTES = 8 * 1024;
/**
 * 上游超时。
 * 实测中转站的 deepseek-v4.1-flash 属**推理模型**: 一次 4 段式回答耗时 13.5s,
 * 原来 15s 只剩 1.5s 余量 —— 网络稍有波动就会误判超时而降级, 所以放到 30s。
 * 客户端超时(ask/page.tsx)必须比这里更大, 否则用户先看到"已取消"。
 */
const UPSTREAM_TIMEOUT_MS = 30_000;

interface AskRequest {
  question: string;
}

interface Citation {
  id: string;
  section: number;
  number: number;
  title: string;
  evidenceLevel: string;
  evidenceDetail?: string;
  sourceUrl?: string | null;
}

interface AskResponse {
  answer: string;
  citations: Citation[];
  model: 'ai' | 'search-only';
  fallback?: boolean;
  /** 降级原因: 未配 key / 上游失败 / 模型引用了原书没有的条目 */
  fallbackReason?: 'no-key' | 'upstream' | 'uncited';
  /**
   * 命中的「急方」场景 (本站据原书急救章节整理的分步卡, 离线可用)。
   * 与 citations 分开返回, 便于页面上明确标注"非原书条目"。
   */
  emergency?: Array<{ slug: string; title: string; desc: string; steps: Array<{ n: string; text: string }> }>;
  /** 本次检索最高分 (用于判断"是否只是字面相近") */
  topScore?: number;
  /** true = 原书未直接覆盖, 下列条目只是字面相近 (页面据此显示提示) */
  weakMatch?: boolean;
  /**
   * 自定义地址被拒绝的原因 (安全规则: 未自带 key 不能用自定义地址 / 地址指向内网 等)。
   * 页面据此提示用户, 而不是静默忽略让人摸不着头脑。
   */
  baseIgnored?: string;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 读取请求体并强制字节上限。
 * 只检查 content-length 是不够的: 客户端用 Transfer-Encoding: chunked 时该头缺失,
 * Number(null) = 0 → 上限形同虚设 (审计实测 20KB body 可绕过)。
 */
async function readBodyLimited(req: Request, maxBytes: number): Promise<string> {
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('TOO_LARGE');

  const reader = req.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let total = 0;
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error('TOO_LARGE');
      }
      out += decoder.decode(value, { stream: true });
    }
  }
  return out + decoder.decode();
}

/** 同源校验: 无鉴权接口不应被第三方页面借访客浏览器调用 */
function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.get('origin');
  if (!site && origin) {
    try {
      return new URL(origin).host === req.headers.get('host');
    } catch {
      return false;
    }
  }
  return true;
}

function buildFallbackAnswer(question: string, ranked: ReturnType<typeof searchEntries>): string {
  if (ranked.length === 0) {
    return `原书未覆盖此问题。建议你尝试: \n1. 在检索器里用关键词搜索 ${stats.totalEntries} 条原文\n2. 查看急救 PWA（心脏骤停、大出血、烧烫伤等 12 个场景）\n3. 在"人生阶段"里选一个看看`;
  }
  // 只有"字面相近"时不能假装切题 —— 页面承诺「不可信的地方会标原书未覆盖」
  const weak = (ranked[0]?.score ?? 0) < MIN_RELEVANT_SCORE;
  const lines: string[] = [
    weak
      ? '原书未直接覆盖此问题。以下是按字面检索到的相近条目, 未必切题, 请自行判断:'
      : '依原书检索, 相关条目如下:',
  ];
  ranked.slice(0, 5).forEach((r, i) => {
    lines.push(`\n[${i + 1}] 第 ${r.entry.section} 节第 ${r.entry.number} 条 · ${r.entry.id}（${r.entry.evidenceLevel} 级）`);
    lines.push(`    ${r.entry.title}`);
    lines.push(`    ${r.entry.plainLanguage}`);
  });
  lines.push('\n⚠️ 实际请咨询当地专业机构');
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  // 1) 同源校验 (挡第三方页面跨站调用)
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: '仅允许站内调用' }, { status: 403 });
  }

  // 2) 限流: 无鉴权 + 会产生真实调用费用
  const limit = checkRateLimit(clientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: '请求过于频繁, 请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  // 3) 请求体: 按真实字节数限长 (chunked 也不能绕过)
  let raw: string;
  try {
    raw = await readBodyLimited(req, MAX_BODY_BYTES);
  } catch (e) {
    if (e instanceof Error && e.message === 'TOO_LARGE') {
      return NextResponse.json({ error: '请求体过大' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 4) 输入校验: 类型必须先判, 否则 null/123/true/{}/[] 会抛 TypeError → 500
  const questionRaw = (body as AskRequest | null)?.question;
  if (typeof questionRaw !== 'string') {
    return NextResponse.json({ error: 'question 必须是字符串' }, { status: 400 });
  }
  const question = questionRaw.trim();
  if (!question) {
    return NextResponse.json({ error: '问题不能为空' }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: '问题过长（500 字以内）' }, { status: 400 });
  }

  const ranked = searchEntries(question, 8);

  // 展示给用户的"引用"只取与最高分同量级的条目 (上限 5):
  // 检索是按分排序的, 尾部常有明显不相关的条目 (实测问"心脏骤停怎么办"时,
  // 第 7/8 条会是"装修合同""报案回执"), 全列出来会让"引用"看起来不严谨。
  // 注意: 送给模型的上下文仍用全部 8 条 —— 多给材料对生成更有利。
  const topScore = ranked[0]?.score ?? 0;
  const displayRanked = ranked.filter((r) => r.score >= topScore * 0.2).slice(0, 5);

  const toCitation = (r: (typeof ranked)[number]): Citation => ({
    id: r.entry.id,
    section: r.entry.section,
    number: r.entry.number,
    title: r.entry.title,
    evidenceLevel: r.entry.evidenceLevel,
    sourceUrl: r.entry.sourceUrl,
  });

  // 纯检索降级用: 正文列举的条目与引用列表必须完全一致
  const citations = displayRanked.map(toCitation);
  // AI 回答用: 模型看到的是全部 8 条, 它引用其中任何一条都合法, 列表也要能点进去
  const citationsAll = ranked.map(toCitation);

  // 原书是否**直接覆盖**这个问题: 分数低于校准阈值时只算"字面相近"
  const weakMatch = topScore < MIN_RELEVANT_SCORE;

  // 命中「急方」场景 (心脏骤停/噎住/大出血...): 这类问题最该先看到分步急救卡
  const emergency = matchEmergencyScenarios(question).map((s) => ({
    slug: s.slug,
    title: s.title,
    desc: s.desc,
    steps: s.steps,
  }));

  // AI 回答 (上游可为: 服务端配置的中转站 / Anthropic 官方 / 访问者自带地址+key)
  const { provider, rejectedBase } = await resolveProvider(req);
  if (provider) {
    try {
      const { system, user } = buildPrompt(question, ranked);
      const answer = await callProvider(provider, system, user, resolveMaxTokens(req));
      if (answer) {
        // 引用校验: 正文里出现的 NN-NN 编号必须都在**模型实际看到的**条目里,
        // 否则视为"编造引用" → 丢弃这段 AI 回答, 降级为纯检索结果 (页面承诺"不编造")
        const bogus = findUncitedIds(answer, ranked.map((r) => r.entry.id));
        if (bogus.length === 0) {
          return NextResponse.json({
            answer,
            citations: citationsAll,
            emergency,
            topScore,
            weakMatch,
            baseIgnored: rejectedBase,
            model: 'ai',
          } satisfies AskResponse);
        }
        // 只记数量与编号, 不落回答正文/用户问题 (日志脱敏)
        console.warn('[ask] model cited unknown entries:', bogus.length, bogus.slice(0, 5).join(','));
        return NextResponse.json({
          answer: buildFallbackAnswer(question, displayRanked),
          citations,
          emergency,
          weakMatch,
          baseIgnored: rejectedBase,
          model: 'search-only',
          fallback: true,
          fallbackReason: 'uncited',
        } satisfies AskResponse);
      }
      // 上游返回空正文 (例如推理模型把 token 全烧在 reasoning 上) → 记一笔, 走下面降级
      console.warn('[ask] upstream returned empty content');
    } catch (e) {
      const name = e instanceof Error ? e.name : 'unknown';
      console.warn('[ask] upstream call failed:', name);
    }
  }

  // 降级: 直接返回检索结果
  // 注意 1: fallback 不能写成 !provider —— 配了上游但调用失败/超时同样是降级,
  //         那样会让 UI 不显示"已降级"提示 (审计发现)
  // 注意 2: 正文里列的条目必须与 citations 完全一致, 否则正文说 5 条、
  //         下方引用只列 1 条, 用户会以为丢了内容
  return NextResponse.json({
    answer: buildFallbackAnswer(question, displayRanked),
    citations,
    emergency,
    topScore,
    weakMatch,
    baseIgnored: rejectedBase,
    model: 'search-only',
    fallback: true,
    fallbackReason: provider ? 'upstream' : 'no-key',
  } satisfies AskResponse);
}

export async function GET() {
  // 公开配置: 供页面显示"AI 是否可用 / 能否自带 key 与地址 / 可选模型"
  // 只暴露能力与模型名, **不暴露部署者配的地址** (那是部署信息, 不该给访客看),
  // 也不暴露任何密钥内容。访问者要用本站默认服务时, 地址留空即可。
  const models = allowedModels();
  const fallbackModel = defaultModel(process.env.ASK_API_BASE ? 'openai' : 'anthropic');
  return NextResponse.json(
    {
      ok: true,
      totalEntries: allEntries.length,
      ai: {
        /** 服务端是否配了协议地址(= 能不能走 AI; 用户自带 key 也需要它) */
        baseConfigured: Boolean(process.env.ASK_API_BASE || process.env.ANTHROPIC_API_KEY),
        /** 服务端是否已自带 key */
        serverKey: Boolean(process.env.ASK_API_KEY || process.env.ANTHROPIC_API_KEY),
        /** 是否允许访问者自带 key */
        byok: Boolean(process.env.ASK_API_BASE),
        /** 是否允许访问者自定义请求地址 (公开部署可设 ASK_ALLOW_CUSTOM_BASE=0 关闭) */
        customBase: customBaseAllowed(),
        models: models.length ? models : [fallbackModel],
        defaultModel: fallbackModel,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
