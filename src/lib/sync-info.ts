import syncLog from '@data/sync-log.json';

/**
 * 上游同步状态 - 让 CC BY 4.0 的"同步/署名"义务可被外部核对
 * 数据来自 scripts/sync-upstream.mjs 写入的 data/sync-log.json
 */
export interface SyncRecord {
  date: string;
  hash: string;
  change: string;
  status: string;
}

export const syncInfo = {
  lastSync: syncLog.lastSync as string,
  upstreamHash: syncLog.upstreamHash as string,
  upstreamUrl: syncLog.upstreamUrl as string,
  upstreamTag: syncLog.upstreamTag as string,
  history: (syncLog.syncHistory ?? []) as SyncRecord[],
};

/** 上游 commit 页 (原文仓库) */
export function upstreamCommitUrl(hash: string): string {
  return `${syncInfo.upstreamUrl.replace(/\.git$/, '')}/commit/${hash}`;
}

/** 短哈希 */
export function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

/** ISO 时间 → 北京时间 "YYYY-MM-DD HH:mm" (显式 +8, 不依赖运行环境时区) */
export function formatBeijing(iso: string): string {
  // 只有日期(无时分)的旧记录原样显示, 不臆造时间
  if (!/\d{2}:\d{2}/.test(iso)) return iso;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  const bj = new Date(t.getTime() + 8 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${bj.getUTCFullYear()}-${p(bj.getUTCMonth() + 1)}-${p(bj.getUTCDate())} ${p(bj.getUTCHours())}:${p(bj.getUTCMinutes())}`;
}

/** 同步日志里的英文状态 → 中文说明 (未知值原样保留, 不改写事实) */
export function syncChangeLabel(change: string): string {
  const c = change.trim();
  if (c === 'updated') return '上游有更新';
  if (c === 'no change') return '上游无变化';
  if (c.startsWith('initial sync')) return '首次同步 (699 条: 454 A / 197 B / 48 C)';
  return c;
}
