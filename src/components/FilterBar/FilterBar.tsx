'use client';

import type { Filter, Section } from '@/types';

interface FilterBarProps {
  sections: Section[];
  filter: Filter;
  onChange: (filter: Filter) => void;
  /**
   * 阶段页专用: 该阶段**专属**章节 id。
   *
   * 为什么需要: 通用章节(9 个)会加进每个阶段, 于是各阶段侧栏的勾选形态几乎一样
   * (实测婴幼儿与上学以后都是"章节 (10)", 首屏勾选形态完全相同, 差异在屏幕外) ——
   * 读者看不出阶段之间的区别。故把专属章节**置顶单列一组**并打标签。
   */
  ownSections?: number[];
  /** 通用章节 id (只有阶段页需要, 用于给它们打「通用」标签) */
  universalSections?: number[];
}

const RATIO_OPTIONS = [
  { v: 'extreme', l: '极高' },
  { v: 'high', l: '高' },
  { v: 'normal', l: '一般' },
] as const;

const CALIBER_OPTIONS = [
  { v: 'life', l: '寿命' },
  { v: 'money', l: '金钱' },
  { v: 'time', l: '时间精力' },
  { v: 'freedom', l: '人身自由' },
] as const;

const EVIDENCE_OPTIONS = ['A', 'B', 'C'] as const;

const COST_MONEY = [
  { v: 'free', l: '不花钱' },
  { v: 'low', l: '少' },
  { v: 'medium', l: '中' },
  { v: 'high', l: '多' },
] as const;

const COST_TIME = [
  { v: 'instant', l: '顺手' },
  { v: 'hours', l: '几小时' },
  { v: 'daily', l: '每天' },
] as const;

const COST_WILL = [
  { v: 'none', l: '不用' },
  { v: 'some', l: '一点' },
  { v: 'high', l: '很多' },
] as const;

export function FilterBar({ sections, filter, onChange, ownSections, universalSections }: FilterBarProps) {
  const own = ownSections ?? [];
  const universal = universalSections ?? [];
  const ownSet = new Set(own);
  const universalSet = new Set(universal);

  const chapterRow = (s: Section) => {
    const isOwn = ownSet.has(s.id);
    const isUniversal = universalSet.has(s.id);
    return (
      <FilterCheckbox
        key={s.id}
        label={`${s.number}. ${s.title}`}
        title={`${s.number}. ${s.title} · ${s.entryCount} 条${
          isOwn ? ' · 本阶段专属' : isUniversal ? ' · 不分年龄通用' : ''
        }`}
        checked={filter.sections.includes(s.id)}
        onChange={() => toggle('sections', s.id)}
        tag={isOwn ? '专属' : isUniversal ? '通用' : undefined}
        tagStrong={isOwn}
      />
    );
  };

  const toggle = <K extends keyof Filter>(key: K, value: any) => {
    const arr = filter[key] as any[];
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    onChange({ ...filter, [key]: next });
  };

  const setQuery = (q: string) => onChange({ ...filter, query: q });

  const clear = () => {
    onChange({
      sections: [],
      ratios: [],
      calibers: [],
      evidenceLevels: [],
      costMoney: [],
      costTime: [],
      costWill: [],
      query: '',
    });
  };

  const activeCount =
    filter.sections.length +
    filter.ratios.length +
    filter.calibers.length +
    filter.evidenceLevels.length +
    filter.costMoney.length +
    filter.costTime.length +
    filter.costWill.length +
    (filter.query ? 1 : 0);

  return (
    <aside
      className="w-full md:w-60 md:flex-shrink-0 p-6 border-r border-border bg-bg-alt md:sticky md:top-[64px] md:self-start md:max-h-[calc(100vh-64px)] md:overflow-y-auto md:overscroll-contain"
      aria-label="筛选"
    >
      <div className="mb-6">
        <label htmlFor="filter-search" className="sr-only">
          搜索条目
        </label>
        <input
          id="filter-search"
          type="search"
          value={filter.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="检索..."
          className="w-full px-3 py-2 bg-bg border border-border text-base outline-none focus:border-vermillion"
          style={{ fontFamily: 'var(--font-zh-body)' }}
        />
      </div>

      {own.length > 0 ? (
        <>
          {/* 阶段页: 专属章节置顶, 让"这个阶段看什么"第一眼就看到 */}
          <FilterGroup title="本阶段专属" count={own.length}>
            {sections.filter((s) => ownSet.has(s.id)).map(chapterRow)}
          </FilterGroup>
          <FilterGroup title="其余章节（含通用）" count={filter.sections.length - own.length}>
            {sections.filter((s) => !ownSet.has(s.id)).map(chapterRow)}
          </FilterGroup>
        </>
      ) : (
        <FilterGroup title="章节" count={filter.sections.length}>
          {sections.map(chapterRow)}
        </FilterGroup>
      )}

      <FilterGroup title="性价比" count={filter.ratios.length}>
        {RATIO_OPTIONS.map((o) => (
          <FilterCheckbox
            key={o.v}
            label={o.l}
            checked={filter.ratios.includes(o.v as any)}
            onChange={() => toggle('ratios', o.v)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="换回" count={filter.calibers.length}>
        {CALIBER_OPTIONS.map((o) => (
          <FilterCheckbox
            key={o.v}
            label={o.l}
            checked={filter.calibers.includes(o.v as any)}
            onChange={() => toggle('calibers', o.v)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="证据等级" count={filter.evidenceLevels.length}>
        {EVIDENCE_OPTIONS.map((v) => (
          <FilterCheckbox
            key={v}
            label={`${v} 级`}
            checked={filter.evidenceLevels.includes(v as any)}
            onChange={() => toggle('evidenceLevels', v)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="成本">
        <FilterSubGroup label="金钱">
          {COST_MONEY.map((o) => (
            <FilterCheckbox
              key={o.v}
              label={o.l}
              checked={filter.costMoney.includes(o.v as any)}
              onChange={() => toggle('costMoney', o.v)}
            />
          ))}
        </FilterSubGroup>
        <FilterSubGroup label="时间">
          {COST_TIME.map((o) => (
            <FilterCheckbox
              key={o.v}
              label={o.l}
              checked={filter.costTime.includes(o.v as any)}
              onChange={() => toggle('costTime', o.v)}
            />
          ))}
        </FilterSubGroup>
        <FilterSubGroup label="毅力">
          {COST_WILL.map((o) => (
            <FilterCheckbox
              key={o.v}
              label={o.l}
              checked={filter.costWill.includes(o.v as any)}
              onChange={() => toggle('costWill', o.v)}
            />
          ))}
        </FilterSubGroup>
      </FilterGroup>

      <button
        onClick={clear}
        disabled={activeCount === 0}
        className="w-full mt-4 py-2 text-sm border border-border hover:border-vermillion hover:text-vermillion disabled:opacity-40 disabled:cursor-not-allowed"
      >
        清空筛选 {activeCount > 0 && `(${activeCount})`}
      </button>
    </aside>
  );
}

function FilterGroup({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-sm text-ink-soft tracking-guo-sm mb-3 flex items-center justify-between">
        <span>{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-seal text-xs">({count})</span>
        )}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterSubGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ml-2 mb-2">
      <div className="text-xs text-ink-soft mb-1">{label}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  label,
  title,
  checked,
  onChange,
  tag,
  tagStrong,
}: {
  label: string;
  title?: string;
  checked: boolean;
  onChange: () => void;
  /** 「专属」/「通用」小标签: 让读者一眼看出该章与当前阶段的关系 */
  tag?: string;
  tagStrong?: boolean;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer text-sm hover:text-vermillion truncate"
      title={title || label}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-seal flex-shrink-0"
      />
      <span className="truncate">{label}</span>
      {tag && (
        <span
          className={`flex-shrink-0 text-[10px] px-1 border ${
            tagStrong ? 'border-seal text-seal' : 'border-border text-ink-soft'
          }`}
        >
          {tag}
        </span>
      )}
    </label>
  );
}
