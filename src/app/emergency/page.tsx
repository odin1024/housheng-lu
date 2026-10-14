import Link from 'next/link';

export const metadata = {
  title: '急方 · 急救',
  description: '黑底朱砂急方卷, 离线可用的急救速查',
};

// PWA 标记 (V1.0 启用 next-pwa)
export const dynamic = 'force-static';

const scenarios = [
  { slug: '心脏骤停', desc: '用力按, 别等救护车' },
  { slug: '大出血', desc: '加压止血' },
  { slug: '烧烫伤', desc: '凉水冲 20 分钟' },
  { slug: '噎住', desc: '海姆立克法' },
  { slug: '中暑', desc: '阴凉处降温' },
  { slug: '一氧化碳', desc: '开门窗, 关气源' },
  { slug: '心梗', desc: '坐位, 拨打 120' },
  { slug: '卒中', desc: '记住发作时间' },
  { slug: '过敏休克', desc: '平卧, 抬高腿' },
  { slug: '癫痫', desc: '侧卧, 勿塞物入口' },
  { slug: '低血糖', desc: '含糖, 意识不清勿喂' },
  { slug: '触电', desc: '先断电再救人' },
];

export default function EmergencyPage() {
  return (
    <div className="dark-mode min-h-[calc(100vh-200px)]">
      <div className="max-w-narrow mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="text-seal text-6xl font-black tracking-guo mb-2" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            急
          </div>
          <h1 className="text-2xl font-bold tracking-guo-sm" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            急方 · 急救卷
          </h1>
          <p className="text-sm text-ink-soft mt-2">
            离线可用 · 可装主屏 · 3 步内可执行
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {scenarios.map((s) => (
            <Link
              key={s.slug}
              href={`/emergency/${encodeURIComponent(s.slug)}`}
              className="block py-5 px-4 border border-seal text-center hover:bg-seal hover:text-bg transition-all"
              style={{
                borderBottom: '1px solid var(--color-seal)',
                color: 'var(--color-seal)',
                textDecoration: 'none',
              }}
            >
              <div className="text-xl font-bold tracking-guo" style={{ fontFamily: 'var(--font-zh-heading)' }}>
                {s.slug}
              </div>
              <div className="text-xs mt-1 opacity-80">
                {s.desc}
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center text-xs text-ink-soft italic mt-12">
          本卷仅供学习与参考, 不构成医疗建议。
          实际急救请立即拨打 120, 以当地急救中心为准。
        </div>

        <div className="juan-end">〔 急方 · 终 〕</div>
      </div>
    </div>
  );
}
