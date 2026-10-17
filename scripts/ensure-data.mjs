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

const hasData =
  existsSync(ENTRIES) && statSync(ENTRIES).size > 1024 && existsSync(SECTIONS) && statSync(SECTIONS).size > 2;

if (process.env.FORCE_DATA_SYNC === '1') {
  console.log('[data] FORCE_DATA_SYNC=1 → 重新同步上游');
} else if (hasData) {
  const kb = Math.round(statSync(ENTRIES).size / 1024);
  console.log(`[data] 已有 data/entries.json (${kb}KB), 跳过联网同步。`);
  console.log('[data] 想更新到最新上游: pnpm build:data (或设 FORCE_DATA_SYNC=1)');
  process.exit(0);
} else {
  console.log('[data] 未找到可用数据, 开始同步上游(需要网络)...');
}

execSync('pnpm sync && pnpm parse', { cwd: ROOT, stdio: 'inherit' });
