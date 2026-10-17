import type { Metadata } from 'next';
import { DecisionMatrix } from '@/components/DecisionMatrix/DecisionMatrix';
import { stats } from '@/lib/entries';

export const metadata: Metadata = {
  title: '决策矩阵',
  description: `把 ${stats.totalEntries} 条按"成本 vs 收益"散点化, 一眼看全图谱, 找高 ROI 区。`,
};

export default function MatrixPage() {
  return (
    <div className="max-w-wide mx-auto px-4 md:px-6 py-8 md:py-12">
      <h1 className="title-juanmu">决策矩阵</h1>
      <p className="title-juanmu-sub">{stats.totalEntries} 条 · 一图尽览</p>
      <p className="text-center text-sm text-ink-soft mb-6 max-w-narrow mx-auto leading-relaxed px-2">
        纵轴是原书的<strong>证据等级</strong>, 横轴是<strong>成本折算</strong> (钱 + 时间 + 毅力)。
        左上角「A 级证据 × 零成本」是最该先做的一格; 点任一格子看里面的条目。
      </p>
      <p className="text-center text-xs text-ink-soft mb-6 max-w-narrow mx-auto leading-relaxed px-2">
        说明: 原书只给了每条带出处的收益数字, <strong>没有逐条的「收益大小」分级</strong>,
        所以本站不设收益轴, 也不给"性价比"打分; 成本折算与排序规则全部公开在
        {' '}<code>src/lib/priority.ts</code>。
      </p>

      <p className="block sm:hidden text-center text-sm text-vermillion mb-6 max-w-narrow mx-auto leading-relaxed px-2 border border-vermillion p-3">
        手机上矩阵需要横向滚动, 建议横屏或改用下方条目清单。
      </p>

      <hr className="zhu-si-lan" />

      <DecisionMatrix />

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="p-4 border border-border bg-bg-alt">
          <h3 className="font-bold mb-2 text-seal" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            怎么读
          </h3>
          <p className="text-ink-soft leading-relaxed">
            数字 = 该格子里的条目数, 底色越深条目越多。
            纵轴从上到下是 A / B / C 级证据, 横轴从左到右成本递增。
          </p>
        </div>
        <div className="p-4 border border-border bg-bg-alt">
          <h3 className="font-bold mb-2 text-seal" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            怎么用
          </h3>
          <p className="text-ink-soft leading-relaxed">
            先看「A 级 × 零成本」有多少条, 点进去挨个做;
            再按口径 (寿命/金钱/时间精力/人身自由) 筛选, 只看你在意的那个维度。
          </p>
        </div>
        <div className="p-4 border border-border bg-bg-alt">
          <h3 className="font-bold mb-2 text-seal" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            重要提醒
          </h3>
          <p className="text-ink-soft leading-relaxed">
            成本分是本站按原书「成本」栏文字折算的档位, 比较粗糙, 只用于互相比较;
            每一分钱、每一个收益数字请点进条目看原书原文与出处。
          </p>
        </div>
      </div>

      <div className="juan-end">〔 决策矩阵 · 终 〕</div>
    </div>
  );
}
