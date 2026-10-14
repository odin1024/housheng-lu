import { notFound } from 'next/navigation';
import Link from 'next/link';

const SCENARIOS: Record<string, { title: string; steps: Array<{ n: string; text: string }>; source: string }> = {
  '心脏骤停': {
    title: '心脏骤停',
    steps: [
      { n: '一', text: '确认无反应, 无呼吸' },
      { n: '二', text: '叫人打 120, 取 AED' },
      { n: '三', text: '用力按, 5-6 cm, 100-120 次/分' },
      { n: '四', text: '不要停, 有人接替再换' },
    ],
    source: 'NEJM 2024 · 中国多中心 · 38,227 例院外心脏骤停',
  },
  '大出血': {
    title: '大出血',
    steps: [
      { n: '一', text: '戴手套或用塑料袋代替' },
      { n: '二', text: '直接加压, 用干净布料' },
      { n: '三', text: '抬高出血部位高于心脏' },
      { n: '四', text: '持续按压, 等救护车' },
    ],
    source: '《急诊医学》第 5 版',
  },
  '烧烫伤': {
    title: '烧烫伤',
    steps: [
      { n: '一', text: '凉水冲 20 分钟, 不是冰水' },
      { n: '二', text: '脱掉非粘连衣物' },
      { n: '三', text: '盖干净纱布, 不要抹油' },
      { n: '四', text: '大面积立即送医' },
    ],
    source: '中华医学会烧伤外科指南 2023',
  },
  '噎住': {
    title: '噎住',
    steps: [
      { n: '一', text: '鼓励咳嗽, 不要拍背' },
      { n: '二', text: '咳不出: 海姆立克法' },
      { n: '三', text: '站在身后, 双手抱肚脐上方' },
      { n: '四', text: '用力向内向上冲击, 直到吐出' },
    ],
    source: '《红十字急救手册》',
  },
  '中暑': {
    title: '中暑',
    steps: [
      { n: '一', text: '移至阴凉处' },
      { n: '二', text: '脱多余衣物' },
      { n: '三', text: '凉水擦身, 风扇吹' },
      { n: '四', text: '意识不清立即送医' },
    ],
    source: '中国疾控中心 2022',
  },
  '一氧化碳': {
    title: '一氧化碳中毒',
    steps: [
      { n: '一', text: '开门窗, 切勿开火' },
      { n: '二', text: '把患者移到通风处' },
      { n: '三', text: '松开衣领, 侧卧防误吸' },
      { n: '四', text: '拨打 120, 立即送有高压氧舱的医院' },
    ],
    source: '中华急诊医学杂志 2021',
  },
};

export function generateStaticParams() {
  return Object.keys(SCENARIOS).map((scenario) => ({ scenario }));
}

export default function EmergencyScenarioPage({ params }: { params: { scenario: string } }) {
  const decoded = decodeURIComponent(params.scenario);
  const data = SCENARIOS[decoded];
  if (!data) notFound();

  return (
    <div className="dark-mode min-h-[calc(100vh-200px)]">
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

        <div className="text-center mb-8">
          <div className="text-seal text-5xl mb-2" style={{ fontFamily: 'var(--font-zh-heading)' }}>
            〔 {data.title} 〕
          </div>
        </div>

        <div className="space-y-6">
          {data.steps.map((step) => (
            <div key={step.n} className="border-l-2 border-seal pl-4">
              <div className="text-seal text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-zh-heading)' }}>
                〔 {step.n} 〕
              </div>
              <div className="text-xl leading-relaxed" style={{ fontFamily: 'var(--font-zh-body)' }}>
                {step.text}
              </div>
            </div>
          ))}
        </div>

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
