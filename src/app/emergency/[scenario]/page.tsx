import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EMERGENCY_SCENARIOS, getScenarioBySlug } from '@/lib/emergency-scenarios';

// 必须返回**未编码**的原始 slug: Next 会先解码 URL 段再匹配 params,
// 若这里返回 encodeURIComponent(slug), 生成的参数与匹配值不一致
// → 配合 dynamicParams=false 时预取请求会永远挂住 (实测 12 个 ?_rsc= 全部不返回,
//   导致 /emergency 永远到不了 network-idle)
export function generateStaticParams() {
  return EMERGENCY_SCENARIOS.map((s) => ({ scenario: s.slug }));
}

// 只允许已生成的场景 (见 lib/emergency-scenarios.ts), 其余真 404:
// 否则根级 loading.tsx 会先以 200 冲刷, notFound() 变成软 404 (审计发现)
export const dynamicParams = false;

export default function EmergencyScenarioPage({ params }: { params: { scenario: string } }) {
  let decoded = params.scenario;
  try {
    decoded = decodeURIComponent(params.scenario);
  } catch {
    notFound(); // 畸形百分号编码 (如 '%E0%A4') 不应抛 URIError
  }
  const data = getScenarioBySlug(decoded);
  if (!data) notFound();

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-narrow mx-auto px-4 py-6">
        <nav className="mb-6">
          <Link
            href="/emergency"
            style={{ borderBottom: 'none' }}
            className="text-ink-soft hover:text-seal text-sm"
          >
            ← 归急方卷
          </Link>
        </nav>

        <h1
          className="text-center text-seal text-5xl mb-8"
          style={{ fontFamily: 'var(--font-zh-heading)' }}
        >
          〔 {data.title} 〕
        </h1>

        {/* 急救步骤用有序列表: 屏幕阅读器能播报"第 N 步, 共 M 步", 视觉上也天然有序 */}
        <ol className="space-y-6 list-none p-0 m-0">
          {data.steps.map((step) => (
            <li key={step.n} className="border-l-2 border-seal pl-4">
              <h2
                className="text-seal text-2xl font-bold mb-1"
                style={{ fontFamily: 'var(--font-zh-heading)' }}
              >
                〔 {step.n} 〕
              </h2>
              <p className="text-xl leading-relaxed m-0" style={{ fontFamily: 'var(--font-zh-body)' }}>
                {step.text}
              </p>
            </li>
          ))}
        </ol>

        <hr className="zhu-si-lan" />

        <div className="text-center">
          <a
            href="tel:120"
            className="inline-block py-4 px-8 border border-seal text-seal text-xl hover:bg-seal hover:text-bg transition-all"
            style={{ borderBottom: '1px solid var(--color-seal)' }}
          >
            📞 直接拨打 120
          </a>
        </div>

        <div className="mt-12 text-xs text-ink-soft italic text-center">
          出处 · {data.source}
        </div>
        <div className="mt-4 text-xs text-seal text-center">
          ⚠️ 内容可能过时, 仅供参考。实际急救以当地急救中心为准。
        </div>

        <div className="juan-end">〔 {data.title} · 终 〕</div>
      </div>
    </div>
  );
}
