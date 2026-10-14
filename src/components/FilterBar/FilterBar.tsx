'use client';

import { useState } from 'react';
import type { Filter, Section } from '@/types';

interface FilterBarProps {
  sections: Section[];
  filter: Filter;
  onChange: (filter: Filter) => void;
}

export function FilterBar({ sections, filter, onChange }: FilterBarProps) {
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

  return (
    <aside className="w-full md:w-60 md:flex-shrink-0 p-6 border-r border-border bg-bg-alt overflow-y-auto">
      <div className="mb-6">
        <input
          type="text"
          value={filter.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="检索..."
          className="w-full px-3 py-2 bg-bg border border-border text-base outline-none focus:border-vermillion"
          style={{ fontFamily: 'var(--font-zh-body)' }}
        />
      </div>

      <FilterGroup title="章节" count={filter.sections.length}>
        {sections.map((s) => (
          <FilterCheckbox
            key={s.id}
            label={`${s.number}. ${s.title}`}
            checked={filter.sections.includes(s.id)}
            onChange={() => toggle('sections', s.id)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="性价比" count={filter.ratios.length}>
        {[
          { v: 'extreme', l: '极高' },
          { v: 'high', l: '高' },
          { v: 'normal', l: '一般' },
        ].map((o) => (
          <FilterCheckbox
            key={o.v}
            label={o.l}
            checked={filter.ratios.includes(o.v as any)}
            onChange={() => toggle('ratios', o.v)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="换回" count={filter.calibers.length}>
        {[
          { v: 'life', l: '寿命' },
          { v: 'money', l: '金钱' },
          { v: 'time', l: '时间精力' },
          { v: 'freedom', l: '人身自由' },
        ].map((o) => (
          <FilterCheckbox
            key={o.v}
            label={o.l}
            checked={filter.calibers.includes(o.v as any)}
            onChange={() => toggle('calibers', o.v)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="证据等级" count={filter.evidenceLevels.length}>
        {['A', 'B', 'C'].map((v) => (
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
          {[
            { v: 'free', l: '不花钱' },
            { v: 'low', l: '少' },
            { v: 'medium', l: '中' },
            { v: 'high', l: '多' },
          ].map((o) => (
            <FilterCheckbox
              key={o.v}
              label={o.l}
              checked={filter.costMoney.includes(o.v as any)}
              onChange={() => toggle('costMoney', o.v)}
            />
          ))}
        </FilterSubGroup>

        <FilterSubGroup label="时间">
          {[
            { v: 'instant', l: '顺手' },
            { v: 'hours', l: '几小时' },
            { v: 'daily', l: '每天' },
          ].map((o) => (
            <FilterCheckbox
              key={o.v}
              label={o.l}
              checked={filter.costTime.includes(o.v as any)}
              onChange={() => toggle('costTime', o.v)}
            />
          ))}
        </FilterSubGroup>

        <FilterSubGroup label="毅力">
          {[
            { v: 'none', l: '不用' },
            { v: 'some', l: '一点' },
            { v: 'high', l: '很多' },
          ].map((o) => (
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
        className="w-full mt-4 py-2 text-sm text-ink-soft border border-border hover:border-vermillion hover:text-vermillion bg-transparent"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        清空筛选
      </button>
    </aside>
  );
}

function FilterGroup({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
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

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm hover:text-vermillion">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-seal"
      />
      <span>{label}</span>
    </label>
  );
}
