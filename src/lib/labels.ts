/**
 * 全局 label 映射 - 避免在多个组件重复定义
 */
import type { EvidenceLevel, Caliber, Ratio } from '@/types';

export const evidenceLabel: Record<EvidenceLevel, string> = {
  A: 'A 级',
  B: 'B 级',
  C: 'C 级',
};

export const ratioLabel: Record<Ratio, string> = {
  extreme: '极高',
  high: '高',
  normal: '一般',
};

export const caliberLabel: Record<Caliber, string> = {
  life: '寿命',
  money: '金钱',
  time: '时间精力',
  freedom: '人身自由',
};

/** 口径配色 (全站唯一来源: 决策矩阵 / 长卷共用) */
export const caliberColor: Record<Caliber, string> = {
  life: '#B73229',
  money: '#C9A227',
  time: '#2C4A6B',
  freedom: '#6B5D4A',
};

export const CALIBERS: Caliber[] = ['life', 'money', 'time', 'freedom'];
