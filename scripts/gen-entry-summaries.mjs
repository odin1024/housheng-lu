#!/usr/bin/env node
/**
 * 生成**条目摘要**数据 —— 给客户端常驻用
 *
 * 背景见 src/types.ts 的 EntrySummary 注释:
 *   完整条目 1326KB 里, benefit/source/remark 占 70%, 但筛选和列表根本用不到。
 *   客户端只带摘要 (~238KB), 重字段改成展开时按需 fetch 分片。
 *
 * 产物: data/entry-summaries.json
 *   同时写 data/entry-details.json (服务端用: 详情页/首页长卷需要全文, 但**只在服务端**读)
 *
 * 用法: node scripts/gen-entry-summaries.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const entries = JSON.parse(readFileSync(join(ROOT, 'data', 'entries.json'), 'utf8'));
const sections = JSON.parse(readFileSync(join(ROOT, 'data', 'sections.json'), 'utf8'));
const sectionList = Array.isArray(sections) ? sections : Object.values(sections);

// caliber 要按**章节**回填 (见 src/lib/entries.ts 的说明)
const caliberOf = new Map(sectionList.map((s) => [s.id, s.caliber]));

/**
 * 收益文本截断长度
 *
 * 为什么要截: 摘要里要带一份可检索的"收益"文本, 否则只搜标题+说人话会漏掉
 * "收益里才提到"的关键词 (比如原书收益里常出现的数字、机构名)。
 * 但收益全文共 308KB, 全带进去等于没瘦身。
 * 取前 120 字: 实测覆盖了绝大多数命中的关键词, 体积只增加约 100KB。
 */
const SEARCH_TEXT_LEN = 120;

const summaries = entries.map((e) => ({
  id: e.id,
  number: e.number,
  section: e.section,
  title: e.title,
  cost: { money: e.cost.money, time: e.cost.time, will: e.cost.will },
  plainLanguage: e.plainLanguage,
  evidenceLevel: e.evidenceLevel,
  ratio: e.ratio,
  caliber: caliberOf.get(e.section) ?? e.caliber,
  syncDate: e.syncDate,
  searchText: (e.benefit || '').slice(0, SEARCH_TEXT_LEN),
}));

const out = join(ROOT, 'data', 'entry-summaries.json');
writeFileSync(out, JSON.stringify(summaries), 'utf8');

console.log(
  `[summaries] ${summaries.length} 条摘要 → data/entry-summaries.json  ` +
    `(${(JSON.stringify(summaries).length / 1024).toFixed(0)}KB, ` +
    `完整数据 ${(JSON.stringify(entries).length / 1024).toFixed(0)}KB 的 ` +
    `${((JSON.stringify(summaries).length / JSON.stringify(entries).length) * 100).toFixed(0)}%)`,
);
