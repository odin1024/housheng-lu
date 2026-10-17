import Link from 'next/link';
import { EMERGENCY_SCENARIOS } from '@/lib/emergency-scenarios';

export const metadata = {
  title: '急方 · 急救',
  description: '黑底朱砂急方卷, 离线可用的急救速查',
};

export default function EmergencyPage() {
  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-narrow mx-auto px-4 py-8">
        <div className="text-center mb-8 md:mb-12">
          <div
            className="text-seal text-5xl md:text-6xl font-black mb-2"
            style={{ fontFamily: 'var(--font-zh-heading)' }}
          >
            急
          </div>
          <h1
            className="text-xl md:text-2xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-zh-heading)' }}
          >
            急方 · 急救卷
          </h1>
          <p className="text-xs md:text-sm text-ink-soft mt-2 px-2">
            离线可用 · 可装主屏 · 3 步内可执行 · 共 {EMERGENCY_SCENARIOS.length} 种场景
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-8">
          {EMERGENCY_SCENARIOS.map((s) => (
            <Link
              key={s.slug}
              href={`/emergency/${encodeURIComponent(s.slug)}`}
              className="block py-3 md:py-5 px-3 md:px-4 border border-seal text-seal text-center bg-transparent hover:bg-seal hover:text-bg hover:border-bg transition-all no-underline"
            >
              <div
                className="text-base md:text-xl font-bold"
                style={{ fontFamily: 'var(--font-zh-heading)' }}
              >
                {s.title}
              </div>
              {/* 去掉 opacity-80: 它把本已达标的朱砂色压到 3.63:1 (12px 需 4.5) */}
              <div className="text-xs mt-1">
                {s.desc}
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center text-xs text-ink-soft italic mt-8 md:mt-12 px-2">
          本卷仅供学习与参考, 不构成医疗建议。
          实际急救请立即拨打 120, 以当地急救中心为准。
        </div>

        <div className="juan-end">〔 急方 · 终 〕</div>
      </div>
    </div>
  );
}
