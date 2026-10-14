import Link from 'next/link';
import { allEntries, stats } from '@/lib/entries';
import { ScrollOfLife } from '@/components/ScrollOfLife';
import { EmergencyCard } from '@/components/Emergency';

export default function HomePage() {
  // 今日必做 5 条 (从 A 级随机)
  const todayPicks = allEntries
    .filter((e) => e.evidenceLevel === 'A' && e.cost.money === 'free')
    .slice(0, 5);

  // 急救速查
  const emergencyEntries = [
    { title: '心脏骤停', desc: '用力按, 5-6 cm', href: '/emergency/心脏骤停' },
    { title: '大出血', desc: '加压止血', href: '/emergency/大出血' },
    { title: '烧烫伤', desc: '凉水冲 20 分钟', href: '/emergency/烧烫伤' },
    { title: '噎住', desc: '海姆立克', href: '/emergency/噎住' },
    { title: '中暑', desc: '阴凉处降温', href: '/emergency/中暑' },
    { title: '一氧化碳', desc: '开门窗', href: '/emergency/一氧化碳' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-bg-alt">
        <div className="max-w-wide mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
          <div className="mb-6">
            <img src="/logo/seal-square.svg" alt="厚生錄" width={96} height={96} className="mx-auto" />
          </div>
          <h1
            className="text-5xl md:text-7xl font-black tracking-guo mb-4"
            style={{ fontFamily: 'var(--font-zh-heading)' }}
          >
            厚生錄
          </h1>
          <p className="text-lg md:text-xl text-vermillion mb-2 tracking-guo">
            七百条生计, 都在案头。
          </p>
          <p className="text-sm md:text-base text-ink-soft mb-8 italic" style={{ fontFamily: 'var(--font-en-heading)' }}>
            HouSheng Lu · Records of Living Well
          </p>
          <hr className="zhu-si-lan w-32 mx-auto" />
          <p className="text-base md:text-lg mt-4">
            《高性价比人生指南》视觉化再刊本
          </p>
          <p className="text-sm text-ink-soft mt-2">
            按 CC BY 4.0 衍生自 eternity4719/HowToLiveBetter
          </p>

          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-seal">{stats.totalEntries}</div>
              <div className="text-ink-soft text-xs tracking-guo-sm">条目</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-seal">{stats.totalSections}</div>
              <div className="text-ink-soft text-xs tracking-guo-sm">章节</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-seal">{stats.evidenceA}</div>
              <div className="text-ink-soft text-xs tracking-guo-sm">A 级证据</div>
            </div>
          </div>
        </div>
      </section>

      {/* 长卷 */}
      <ScrollOfLife />

      {/* 双栏: 急救 + 今日 */}
      <section className="max-w-wide mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 急救速查 */}
          <div className="md:col-span-1">
            <h2 className="title-juanmu-sub text-left mb-4">急方</h2>
            <div className="space-y-3">
              {emergencyEntries.map((e) => (
                <EmergencyCard key={e.title} title={e.title} description={e.desc} href={e.href} />
              ))}
            </div>
            <Link
              href="/emergency"
              className="block mt-4 text-center py-3 text-sm border border-vermillion text-vermillion hover:bg-vermillion hover:text-bg"
              style={{ borderBottom: '1px solid var(--color-vermillion)' }}
            >
              ▣ 进急方卷
            </Link>
          </div>

          {/* 今日必做 */}
          <div className="md:col-span-2">
            <h2 className="title-juanmu-sub text-left mb-4">今日必做</h2>
            <div className="space-y-3">
              {todayPicks.map((entry, i) => (
                <Link
                  key={entry.id}
                  href={`/book/${entry.id}`}
                  className="block py-3 border-b border-border hover:bg-bg-alt transition-colors"
                  style={{ borderBottom: '1px solid var(--color-border)', textDecoration: 'none' }}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-seal font-bold text-lg" style={{ fontFamily: 'var(--font-mono)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-bold" style={{ fontFamily: 'var(--font-zh-heading)' }}>
                      {entry.title}
                    </span>
                    <span className="text-xs text-ink-soft ml-auto">
                      A · {entry.caliber}
                    </span>
                  </div>
                  <div className="text-sm text-ink-soft mt-1 ml-8 leading-relaxed">
                    {entry.plainLanguage.slice(0, 60)}
                    {entry.plainLanguage.length > 60 ? '...' : ''}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 人生阶段入口 */}
      <section className="max-w-wide mx-auto px-4 md:px-6 py-12 border-t border-border">
        <h2 className="title-juanmu-sub mb-8">人生阶段</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { stage: '高中生', icon: '☉' },
            { stage: '大学生', icon: '☉' },
            { stage: '刚工作', icon: '☉' },
            { stage: '中年', icon: '☉' },
            { stage: '退休前后', icon: '☉' },
          ].map((s) => (
            <Link
              key={s.stage}
              href={`/explore?stage=${encodeURIComponent(s.stage)}`}
              className="block p-6 border border-border text-center hover:border-vermillion hover:bg-bg-alt transition-all"
              style={{ borderBottom: '1px solid var(--color-border)', textDecoration: 'none' }}
            >
              <div className="text-4xl text-seal mb-2">{s.icon}</div>
              <div className="text-base font-bold tracking-guo-sm" style={{ fontFamily: 'var(--font-zh-heading)' }}>
                {s.stage}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 卷末 */}
      <div className="juan-end">
        〔 厚生錄 · 卷端 〕
      </div>
    </>
  );
}
