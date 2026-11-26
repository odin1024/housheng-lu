#!/usr/bin/env node
/**
 * 生成条目全文分片 —— 用来把 1.3MB 的完整条目数据从客户端 bundle 里摘出去
 *
 * 背景:
 *   `src/lib/entries.ts` 直接 `import entriesData from '@data/entries.json'`,
 *   而 EntryCard / FilterBar / DecisionMatrix / PosterGenerator 都是 'use client',
 *   webpack 就把**整份** entries.json (1.3MB) 塞进了每个相关路由的 client chunk。
 *   实测: 单个 chunk 2527KB, 其中数据占 1326KB。
 *
 *   静态导出 (GitHub Pages) 没有运行时 API, 所以"展开时去服务端要全文"这条路走不通。
 *   折中方案: 构建期把每条的**重字段** (benefit / source / remark / ...) 切成单个静态
 *   JSON 文件, 客户端展开某条时按需 fetch 那个分片 —— 首次只拉 ~1.3KB。
 *
 * 产物: public/entry-detail/<id>.json   (如 public/entry-detail/01-01.json)
 *
 * 用法: node scripts/gen-entry-details.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'public', 'entry-detail');

const entries = JSON.parse(
  await import('node:fs').then((fs) => fs.readFileSync(join(ROOT, 'data', 'entries.json'), 'utf8')),
);

/** 这些字段是"重"的, 占了全量数据的 70% (source 445KB + benefit 308KB + remark 175KB) */
const HEAVY = ['benefit', 'source', 'sourceUrl', 'evidenceDetail', 'controversy', 'remark'];

mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
let max = 0;
for (const e of entries) {
  const detail = { id: e.id };
  for (const k of HEAVY) detail[k] = e[k];
  // cost.detail 一起放进来: 摘要态不带它, 但"成 本"那段要显示
  detail.costDetail = e.cost?.detail ?? '';
  const json = JSON.stringify(detail);
  writeFileSync(join(OUT_DIR, `${e.id}.json`), json, 'utf8');
  total += json.length;
  if (json.length > max) max = json.length;
}

console.log(
  `[details] 已生成 ${entries.length} 个分片 → public/entry-detail/  ` +
    `(合计 ${(total / 1024).toFixed(0)}KB, 单个最大 ${(max / 1024).toFixed(1)}KB)`,
);
