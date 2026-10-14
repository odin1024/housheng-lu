import { notFound } from 'next/navigation';
import Link from 'next/link';
import { allEntries, getEntryById, getEntriesBySection } from '@/lib/entries';
import { EntryCard } from '@/components/EntryCard';

export function generateStaticParams() {
  return allEntries.map((e) => ({ id: e.id }));
}

export default function BookEntryPage({ params }: { params: { id: string } }) {
  const entry = getEntryById(params.id);
  if (!entry) notFound();

  const sectionEntries = getEntriesBySection(entry.section);
  const idx = sectionEntries.findIndex((e) => e.id === entry.id);
  const prev = idx > 0 ? sectionEntries[idx - 1] : null;
  const next = idx < sectionEntries.length - 1 ? sectionEntries[idx + 1] : null;

  return (
    <article className="max-w-narrow mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* 上一回 / 下一回 */}
      <nav className="flex justify-between text-sm mb-8">
        {prev ? (
          <Link href={`/book/${prev.id}`} style={{ borderBottom: 'none' }} className="text-indigo hover:text-vermillion">
            ← {prev.title.slice(0, 20)}
          </Link>
        ) : (
          <span />
        )}
        <Link href={`/explore?section=${entry.section}`} style={{ borderBottom: 'none' }} className="text-ink-soft hover:text-vermillion">
          第 {entry.section} 节
        </Link>
        {next ? (
          <Link href={`/book/${next.id}`} style={{ borderBottom: 'none' }} className="text-indigo hover:text-vermillion">
            {next.title.slice(0, 20)} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* 回目标题 */}
      <h1 className="title-juanmu">
        第 {String(entry.number).padStart(2, '0')} 条
      </h1>
      <h2 className="title-juanmu-sub">
        {entry.title}
      </h2>

      <hr className="zhu-si-lan" />

      {/* 默认态卡片(展开) */}
      <EntryCard entry={entry} expanded={true} showSeal={false} />

      <hr className="zhu-si-lan" />

      {/* 本卷其他条目 */}
      <section className="mt-8">
        <h3 className="text-lg font-bold tracking-guo-sm mb-4" style={{ fontFamily: 'var(--font-zh-heading)' }}>
          本卷其他条目
        </h3>
        <ul className="space-y-2">
          {sectionEntries
            .filter((e) => e.id !== entry.id)
            .map((e) => (
              <li key={e.id}>
                <Link
                  href={`/book/${e.id}`}
                  className="block py-2 hover:text-vermillion"
                  style={{ borderBottom: '1px dashed var(--color-border)' }}
                >
                  <span className="text-seal font-mono text-xs mr-3">{e.id}</span>
                  {e.title}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <div className="juan-end">
        〔 第 {String(entry.section).padStart(2, '0')} 节 · 第 {String(entry.number).padStart(2, '0')} 条 · 终 〕
      </div>
    </article>
  );
}
