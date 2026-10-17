import { EMERGENCY_SCENARIOS, type EmergencyScenario } from './emergency-scenarios';

/**
 * 把用户问题匹配到「急方」场景
 *
 * 为什么需要: /ask 只检索原书条目, 而本站把原书急救章节 (第 13 节) 整理成了 12 张
 * 分步急救卡 (离线可用)。用户问「噎住了怎么办」时, 如果只回条目、不给那张 4 步卡,
 * 最该被看到的内容反而看不到 —— 这是安全相关的功能缺口。
 *
 * 匹配策略: 场景名直接命中(高权) + 常见口语别名(中权)。
 * 别名表是**本站**为了让人问得出而加的口语词, 不属于原书内容。
 */
const ALIASES: Record<string, string[]> = {
  心脏骤停: ['骤停', '心肺复苏', 'cpr', '没呼吸', '无呼吸', '没有呼吸', '猝死', '按压'],
  大出血: ['出血', '流血', '止血', '割伤'],
  烧烫伤: ['烫伤', '烧伤', '开水烫', '火燎'],
  噎住: ['噎', '窒息', '卡喉', '卡住', '异物', '海姆立克'],
  中暑: ['中暑', '热射病', '晒晕', '高温晕'],
  一氧化碳: ['一氧化碳', '煤气', '炭火', 'co中毒', '煤炉'],
  心梗: ['心梗', '心绞痛', '胸痛', '胸口疼', '胸口压', '心肌'],
  卒中: ['卒中', '中风', '脑梗', '脑出血', '嘴歪', '半边'],
  过敏性休克: ['过敏性休克', '过敏', '休克', '喉头'],
  癫痫: ['癫痫', '抽搐', '抽风', '羊癫疯'],
  低血糖: ['低血糖', '血糖低', '手抖', '出冷汗'],
  触电: ['触电', '电击', '漏电'],
};

export function matchEmergencyScenarios(query: string, limit = 2): EmergencyScenario[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = EMERGENCY_SCENARIOS.map((s) => {
    let score = 0;
    if (q.includes(s.slug.toLowerCase())) score += 10;
    if (q.includes(s.title.toLowerCase())) score += 10;
    for (const alias of ALIASES[s.slug] ?? []) {
      if (q.includes(alias.toLowerCase())) score += 4;
    }
    return { s, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.s);
}
