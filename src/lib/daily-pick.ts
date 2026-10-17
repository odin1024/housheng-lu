import type { Entry } from '@/types';

/**
 * 按日期稳定随机: 同一天看到的 5 条是固定的
 * 用 mulberry32 伪随机 + 日期种子
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dayOfYearSeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now.getTime() - start.getTime()) / 86_400_000;
  // 用 年 + 年内第几天 做种子, 一年内每天唯一
  return now.getFullYear() * 1000 + Math.floor(diff);
}

/**
 * 挑 5 条 A 级 + 不花钱 的条目作为今日必做
 * 每天固定, 跨刷新不重复
 */
export function pickDaily(entries: Entry[], count = 5): Entry[] {
  const candidates = entries.filter(
    (e) => e.evidenceLevel === 'A' && e.cost.money === 'free',
  );
  if (candidates.length <= count) return candidates;

  const rand = mulberry32(dayOfSeedToday());
  // Fisher-Yates 部分洗牌
  const arr = [...candidates];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

// 给客户端一致随机用的同日种子 (避免 SSR/CSR 不一致)
function dayOfSeedToday(): number {
  if (typeof window === 'undefined') {
    return dayOfYearSeed();
  }
  return dayOfYearSeed();
}
