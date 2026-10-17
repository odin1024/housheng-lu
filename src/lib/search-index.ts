import { allEntries, stats } from './entries';
import type { Entry } from '@/types';

/**
 * 简单检索 - 用于给 LLM 提供最相关的 5-8 条上下文
 *
 * 中文检索策略 (v2, 2026-10-16 重写):
 *   旧版把整句当作一个短语做 `includes`, 于是「心脏骤停怎么办」这种自然问句
 *   永远不可能作为连续子串命中 —— 分句通道贡献恒为 0, 实际只剩"按字重合比例"打分,
 *   高频字 (的/了/是/有/人...) 因此压过罕见词。实测: 问「心脏骤停怎么办」时,
 *   正确条目 13-01 (心肺复苏) 排第 4, 被「亲人刚走的那几天…」这类包含"心/人/的"的条目盖过;
 *   问「吸烟有什么危害」时, 02-01「戒烟，越早越好」排到第 24。
 *
 *   现改为 **n-gram + IDF 加权**:
 *     1) 按标点切成小句, 再对汉字连续段生成 2~4 元滑窗词项 (长词优先, 上限 24 个)
 *     2) 对每个词项用全库文档频率算 IDF —— 罕见词(骤停/押金/安全带)权重高,
 *        高频词(怎么办/的/有)权重自然趋近 0, 不需要维护停用词表
 *     3) 命中标题 > 说人话 > 收益, 再加证据等级微调
 */
export interface RankedEntry {
  entry: Entry;
  score: number;
  matchedFields: string[];
}

/** 仅过滤纯粹的语助词; 其余交给 IDF 自动降权 */
const PARTICLES = new Set('的了是就都也还很太更最啊哦嗯呀吧呢吗'.split(''));

/**
 * 功能性短语黑名单 (疑问/量词/连接词等)
 *
 * 为什么光靠 IDF 不够: IDF 只能识别"常见 = 不重要", 但**在本库里罕见的废话**照样会被当成
 * 高信息量词项。实测两个离题问题就是被这种词顶上去的:
 *   问「量子力学是什么?」→ 靠「是什么」(df=9) 拿到 45 分
 *   问「怎么养一只猫?」→ 靠「一只」(df=9) 拿到 31 分
 * 而真正切题的「被骗了钱能追回吗?」只有 31.7 分 —— 所以**任何分数阈值都分不开好坏**,
 * 必须先把这类词剔除, 再谈相关性判定。
 */
const STOP_PHRASES = new Set([
  '是什么', '是什', '什么', '怎么', '怎样', '怎样', '如何', '为什么', '为何', '多少', '多久',
  '哪些', '哪个', '哪种', '哪里', '可以', '能不能', '能否', '要不要', '有没有', '是否',
  '一只', '一个', '一下', '一些', '一样', '一直', '一起', '一点', '一次',
  '才能', '就能', '就是', '还是', '或者', '因为', '所以', '如果', '但是', '不过', '已经',
  '正在', '可能', '应该', '需要', '必须', '一般', '通常', '大概', '也许', '感觉', '觉得',
  '知道', '了解', '告诉', '介绍', '推荐', '请问', '谢谢', '帮忙', '现在', '之前', '之后',
  '时候', '的话', '这样', '那样', '这个', '那个', '这里', '那里', '我们', '你们', '他们',
]);

const MAX_TERMS = 24;

/** 取查询里的候选词项: 小句 + 2~4 元汉字 n-gram, 长词优先 */
function extractTerms(query: string): string[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];

  // 汉字连续段 (英文/数字另走 ascii 通道)
  const runs = lower.match(/\p{Script=Han}+/gu) ?? [];
  const terms: string[] = [];

  // 小句整体 (罕见命中, 但命中即为强信号)
  for (const clause of lower.split(/[，。？?！!,;:、\s]+/)) {
    const c = clause.trim();
    if (c.length >= 4 && !STOP_PHRASES.has(c)) terms.push(c);
  }

  // n-gram: 4 元 → 3 元 → 2 元 (长词更具体, 优先保留)
  for (const len of [4, 3, 2]) {
    for (const run of runs) {
      for (let i = 0; i + len <= run.length; i++) {
        const gram = run.slice(i, i + len);
        // 全是语助词的组合直接丢弃
        if ([...gram].every((ch) => PARTICLES.has(ch))) continue;
        // 功能性短语丢弃 (否则会靠"罕见"骗到高 IDF)
        if (STOP_PHRASES.has(gram)) continue;
        terms.push(gram);
      }
    }
  }

  // 英文/数字整词
  for (const tok of lower.match(/[a-z0-9]{2,}/g) ?? []) terms.push(tok);

  return [...new Set(terms)].slice(0, MAX_TERMS);
}

/**
 * 相关性下限 (实测校准, 非拍脑袋)
 *
 * 用 8 个真问题 + 5 个离题问题实测 topScore (2026-10-16):
 *   真问题: 安全带 292.8 / 发烧 235.6 / 低钠盐 199.0 / 骤停 134.1 / 吸烟 133.1 / 押金 81.6 / 空腹 54.6 / 被骗 49.0
 *   离题:   猫 0.00 / 量子力学 0.00 / 写诗 15.0 / 电影 33.2 ("股票怎么选" 68.2 其实原书**确实**覆盖, 不计离题)
 * 取 25: 真问题全部保留, "猫/量子力学/写诗" 归入"原书未直接覆盖"。
 *
 * 注意: 这是关键词检索的经验阈值, 会随语料规模变化 ——
 * 调整分词或数据量后, 必须重跑 tests/audit-score-calibration.spec.ts 重新校准。
 */
export const MIN_RELEVANT_SCORE = 25;

export function searchEntries(query: string, limit = 8): RankedEntry[] {
  const terms = extractTerms(query);
  if (terms.length === 0) return [];

  const title = new Map<string, string>();
  const plain = new Map<string, string>();
  const benefit = new Map<string, string>();
  for (const e of allEntries) {
    title.set(e.id, e.title.toLowerCase());
    plain.set(e.id, e.plainLanguage.toLowerCase());
    benefit.set(e.id, e.benefit.toLowerCase());
  }

  // 文档频率: 该词项在多少条里出现过 (用于算 IDF)
  const df = new Map<string, number>();
  for (const t of terms) {
    let n = 0;
    for (const e of allEntries) {
      if (
        title.get(e.id)!.includes(t) ||
        plain.get(e.id)!.includes(t) ||
        benefit.get(e.id)!.includes(t)
      ) {
        n++;
      }
    }
    df.set(t, n);
  }

  const N = allEntries.length;
  const results: RankedEntry[] = [];

  for (const entry of allEntries) {
    const t = title.get(entry.id)!;
    const p = plain.get(entry.id)!;
    const b = benefit.get(entry.id)!;
    let score = 0;
    const matched: string[] = [];

    for (const term of terms) {
      const d = df.get(term) ?? 0;
      if (d === 0 || d === N) continue; // 全库都有 = 无区分度
      const idf = Math.log(1 + N / (1 + d));
      if (t.includes(term)) {
        score += idf * 4;
        if (!matched.includes('title')) matched.push('title');
      }
      if (p.includes(term)) {
        score += idf * 2;
        if (!matched.includes('plain')) matched.push('plain');
      }
      if (b.includes(term)) {
        score += idf * 1.2;
        if (!matched.includes('benefit')) matched.push('benefit');
      }
    }

    // 命中的词项越多越好 (避免被单个长词垄断)
    if (score > 0) score *= 1 + Math.log(1 + matched.length) * 0.25;

    if (entry.evidenceLevel === 'A') score *= 1.15;
    else if (entry.evidenceLevel === 'C') score *= 0.85;

    if (score > 0) results.push({ entry, score, matchedFields: matched });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * 把命中的条目格式化成 LLM 用的上下文
 * 强约束: LLM 只能基于此回答, 不能编造
 */
export function buildContext(ranked: RankedEntry[]): string {
  if (ranked.length === 0) {
    return `（在《高性价比人生指南》的 ${stats.totalEntries} 条中没有直接相关内容。）`;
  }
  return ranked
    .map(
      (r, i) =>
        `[${i + 1}] 第 ${r.entry.section} 节 · 第 ${r.entry.number} 条 · ${r.entry.id} (${r.entry.evidenceLevel} 级)\n` +
        `标题: ${r.entry.title}\n` +
        `说人话: ${r.entry.plainLanguage}\n` +
        `收益: ${r.entry.benefit.slice(0, 200)}${r.entry.benefit.length > 200 ? '…' : ''}\n` +
        (r.entry.sourceUrl ? `来源: ${r.entry.sourceUrl}\n` : ''),
    )
    .join('\n');
}

const SYSTEM_PROMPT = `你是「厚生錄」的古籍问答助手。规则（绝对不可违反）：

1. 你只能基于下方【相关条目】回答用户问题。每一条主张必须引用「第 X 节 · 第 Y 条 · 章节编号」格式。
2. 如果【相关条目】里没有答案，明确说"原书未覆盖此问题"。
3. 绝对不要发明新建议、新研究、新数据。
4. 绝对不要给出原书没写过的医疗/法律/财务具体建议。
5. 引用格式举例: "见第 8 节第 8 条（08-08）" 或 "参见第 13 节急救章节"。
6. 涉及急救/法律/医疗时，必须在末尾加"⚠️ 实际请咨询当地专业机构"。
7. 语气保持古籍风格（简短、半文言），不要 emoji，不要感叹号。
8. 不要超过 8 条引用。

【原书背景】
本书名《高性价比人生指南》by eternity4719，共 ${stats.totalEntries} 条循证建议，${stats.totalSections} 章节。涵盖健康、急救、法律红线、金钱、感情、应急等。所有内容有 PubMed/Cochrane/NEJM/国家法规等出处。

【相关条目】
{context}

【回答】`;

export function buildPrompt(
  question: string,
  ranked: RankedEntry[],
): { system: string; user: string; citations: RankedEntry[] } {
  const context = buildContext(ranked);
  return {
    // 必须用函数形式: 替换串里的 $&、$1、$` 在 String.replace 里有特殊含义,
    // 原书正文一旦出现这些字符就会污染提示词
    system: SYSTEM_PROMPT.replace('{context}', () => context),
    user: question,
    citations: ranked,
  };
}
