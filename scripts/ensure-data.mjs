#!/usr/bin/env node
/**
 * prebuild 前置检查: 决定要不要重新生成数据
 *
 * 背景(为什么要这个脚本):
 *   原来 `prebuild` 直接是 `pnpm build:data`(= sync + parse), 于是**每次 `next build`
 *   都会联网重新克隆上游**, 即使仓库里已经带着数据 —— clone 之后离线根本构建不了。
 *   而 deploy.yml 里其实已经写了"数据不存在才同步"的正确逻辑, 却被 prebuild 覆盖,
 *   两处逻辑互相打架。
 *
 * 现在的行为:
 *   · data/entries.json 存在且非空 → 直接用它 (离线可构建, 秒级通过)
 *   · 缺失/为空                   → 才 sync + parse (需要网络)
 *   · 环境变量 FORCE_DATA_SYNC=1  → 强制重新同步 (想更新到最新上游时用)
 *
 * 想主动更新数据: `pnpm sync && pnpm parse`(或 `pnpm build:data`)
 */
import { existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRIES = join(ROOT, 'data', 'entries.json');
const SECTIONS = join(ROOT, 'data', 'sections.json');
const SUMMARIES = join(ROOT, 'data', 'entry-summaries.json');
const DETAIL_DIR = join(ROOT, 'public', 'entry-detail');

const hasData =
  existsSync(ENTRIES) && statSync(ENTRIES).size > 1024 && existsSync(SECTIONS) && statSync(SECTIONS).size > 2;

/**
 * 派生数据是否比源数据旧 (或缺失)
 *
 * 为什么必须检查:
 *   entries.json 是唯一的"真相", entry-summaries.json 与 public/entry-detail/*
 *   都是构建期从它派生出来的。每日同步只会更新 entries.json ——
 *   如果不重新派生, 站点就会用**旧摘要**渲染, 表现为"同步成功了但线上没变"
 *   (与之前踩过的 GitHub Pages 那类静默故障同源)。
 */
function derivedIsStale() {
  if (!existsSync(SUMMARIES) || statSync(SUMMARIES).size < 1024) return '摘要文件缺失';
  if (!existsSync(DETAIL_DIR)) return '详情分片目录缺失';

  const srcMtime = statSync(ENTRIES).mtimeMs;
  if (statSync(SUMMARIES).mtimeMs < srcMtime) return '摘要比源数据旧';

  // 分片数量应与条目数一致 (抽一个文件判断新旧, 避免遍历 774 个文件)
  const sample = join(DETAIL_DIR, '01-01.json');
  if (!existsSync(sample)) return '详情分片样例缺失';
  if (statSync(sample).mtimeMs < srcMtime) return '详情分片比源数据旧';

  return null;
}

function regenerateDerived() {
  console.log('[data] 重新生成派生数据 (摘要 + 详情分片)...');
  execSync('node scripts/gen-entry-summaries.mjs', { cwd: ROOT, stdio: 'inherit' });
  execSync('node scripts/gen-entry-details.mjs', { cwd: ROOT, stdio: 'inherit' });
}

if (process.env.FORCE_DATA_SYNC === '1') {
  console.log('[data] FORCE_DATA_SYNC=1 → 重新同步上游');
} else if (hasData) {
  const kb = Math.round(statSync(ENTRIES).size / 1024);
  console.log(`[data] 已有 data/entries.json (${kb}KB), 跳过联网同步。`);

  const stale = derivedIsStale();
  if (stale) {
    console.log(`[data] 派生数据需要更新: ${stale}`);
    regenerateDerived();
  } else {
    console.log('[data] 摘要与详情分片均是最新, 跳过生成。');
  }

  console.log('[data] 想更新到最新上游: pnpm build:data (或设 FORCE_DATA_SYNC=1)');
  process.exit(0);
} else {
  console.log('[data] 未找到可用数据, 开始同步上游(需要网络)...');
}

execSync('pnpm sync && pnpm parse', { cwd: ROOT, stdio: 'inherit' });
// 同步/解析完必须立刻派生, 否则摘要落后于源数据
regenerateDerived();
