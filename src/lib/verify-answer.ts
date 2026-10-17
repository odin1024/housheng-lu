/**
 * 回答引用校验 (纯函数, 便于单测)
 *
 * 页面标语承诺「所有回答只引用原书 · 不编造」, 但此前只靠系统提示词自律 ——
 * 模型完全可能在正文里写出原书并不存在的条目编号 (如「第 99 节第 3 条」/「31-99」)。
 * citations 列表本身来自本地检索 (可信), 但**正文**里的引用无人核对。
 *
 * 这里把正文里出现的 NN-NN 形态编号全部抓出来, 与允许集合比对:
 * 出现任何不在 citations 里的编号 → 判定为编造, 调用方据此丢弃这段 AI 回答、降级为纯检索。
 */

/**
 * 抓取正文中的条目编号 (01-01 形态)
 *
 * 必须用前后否定环视, 不能用 \b:
 *   `\b(\d{2})-(\d{2})\b` 会把日期 "2026-09-20" 里的 "09-20" 当成条目编号,
 *   于是一段完全正常的 AI 回答会因为含日期而被误判成"编造引用"并被丢弃 (实测)。
 * 前后不允许再出现数字或连字符, 即可排除日期/区间/长数字。
 */
const ID_PATTERN = /(?<![\d-])(\d{2})-(\d{2})(?![\d-])/g;

export function extractCitedIds(answer: string): string[] {
  const out: string[] = [];
  for (const m of answer.matchAll(ID_PATTERN)) {
    out.push(`${m[1]}-${m[2]}`);
  }
  return [...new Set(out)];
}

/** 返回正文里引用了但不在允许集合中的编号 (空数组 = 干净) */
export function findUncitedIds(answer: string, allowedIds: Iterable<string>): string[] {
  const allowed = new Set(allowedIds);
  return extractCitedIds(answer).filter((id) => !allowed.has(id));
}
