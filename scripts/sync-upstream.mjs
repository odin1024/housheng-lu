#!/usr/bin/env node
/**
 * 同步上游原书仓库
 * 用法: node scripts/sync-upstream.mjs
 * 必须在 git 仓库根目录执行
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UPSTREAM_DIR = join(ROOT, 'content', 'upstream');
const UPSTREAM_URL = 'https://github.com/eternity4719/HowToLiveBetter.git';
const UPSTREAM_BRANCH = 'main';
const DATA_DIR = join(ROOT, 'data');

function log(msg) {
  console.log(`\x1b[36m[同步]\x1b[0m ${msg}`);
}

function ok(msg) {
  console.log(`\x1b[32m[完成]\x1b[0m ${msg}`);
}

function err(msg) {
  console.error(`\x1b[31m[错误]\x1b[0m ${msg}`);
  process.exit(1);
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function run(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (e) {
    err(`命令执行失败: ${cmd}\n${e.message}`);
  }
}

function getUpstreamHash() {
  if (!existsSync(join(UPSTREAM_DIR, '.git'))) return null;
  return run('git rev-parse HEAD', UPSTREAM_DIR);
}

function ensureDataDir() {
  ensureDir(DATA_DIR);
}

function writeSyncLog(syncResult) {
  ensureDataDir();
  const logPath = join(DATA_DIR, 'sync-log.json');

  let existing = { syncHistory: [] };
  if (existsSync(logPath)) {
    try {
      existing = JSON.parse(readFileSync(logPath, 'utf-8'));
    } catch {
      existing = { syncHistory: [] };
    }
  }

  // 幂等: 上游哈希没变就**不重写文件**。
  // 否则每次同步都会写入新的 lastSync/date 时间戳 → 每日 workflow 天天产生空提交
  // (审计 P0: 非幂等时间戳导致每晚无意义提交与部署)
  if (existing.upstreamHash && existing.upstreamHash === syncResult.hash) {
    log('上游无变化, 不更新 sync-log.json (避免产生空提交)');
    return;
  }

  const newEntry = {
    date: new Date().toISOString(),
    hash: syncResult.hash,
    change: syncResult.change,
    status: syncResult.status,
  };

  existing.lastSync = new Date().toISOString();
  existing.upstreamHash = syncResult.hash;
  existing.upstreamUrl = UPSTREAM_URL;
  existing.upstreamTag = UPSTREAM_BRANCH;
  existing.syncHistory = [newEntry, ...(existing.syncHistory || []).slice(0, 30)];

  writeFileSync(logPath, JSON.stringify(existing, null, 2), 'utf-8');
}

async function main() {
  log('开始同步上游...');

  ensureDir(UPSTREAM_DIR);

  const isInit = !existsSync(join(UPSTREAM_DIR, '.git'));
  const beforeHash = getUpstreamHash();

  if (isInit) {
    log(`首次同步, 克隆 ${UPSTREAM_URL}...`);
    run(`git clone --depth 1 --branch ${UPSTREAM_BRANCH} ${UPSTREAM_URL} ${UPSTREAM_DIR}`);
  } else {
    log(`拉取上游更新...`);
    run('git fetch origin', UPSTREAM_DIR);
    run(`git reset --hard origin/${UPSTREAM_BRANCH}`, UPSTREAM_DIR);
  }

  const afterHash = getUpstreamHash();
  const change = beforeHash === afterHash ? 'no change' : 'updated';

  ok(`同步完成`);
  ok(`  上游: ${UPSTREAM_URL}`);
  ok(`  分支: ${UPSTREAM_BRANCH}`);
  ok(`  提交: ${afterHash?.slice(0, 7)}`);
  ok(`  变化: ${change}`);

  writeSyncLog({
    hash: afterHash,
    change,
    status: 'success',
  });

  log('下一步: pnpm parse 生成 entries.json');
}

main().catch((e) => {
  err(e.message);
});
