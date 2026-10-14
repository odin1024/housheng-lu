import Link from 'next/link';
import { attribution } from '@/lib/compliance';

export const metadata = {
  title: '卷末',
  description: '关于厚生錄, 关于 CC BY 4.0, 关于合规与同步',
};

export default function AboutPage() {
  return (
    <article className="max-w-narrow mx-auto px-4 md:px-6 py-12 md:py-16">
      <h1 className="title-juanmu">卷 末</h1>
      <p className="title-juanmu-sub">关 于 本 站</p>

      <hr className="zhu-si-lan" />

      {/* 是什么 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3 tracking-guo-sm">什么是厚生錄</h2>
        <p className="leading-loose mb-3">
          厚生錄是开源电子书{' '}
          <a href={attribution.sourceUrl} target="_blank" rel="noopener">
            《{attribution.source}》
          </a>{' '}
          的视觉化再刊本。
        </p>
        <p className="leading-loose mb-3">
          原书以 Markdown 形式收录了 699 条循证生活建议, 每条写明成本、收益、证据等级与原始出处。
          本项目在不改动原书内容的前提下, 将其重新设计为一部可以翻阅、可以筛查、可以离线急救的现代古籍善本。
        </p>
        <p className="leading-loose">
          气质上, 本项目定位为: <strong>循证生活的古籍善本, 不是工具站</strong>。
        </p>
      </section>

      {/* 与原书的关系 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3 tracking-guo-sm">与原书的关系</h2>
        <p className="leading-loose mb-3">
          按{' '}
          <a href={attribution.licenseUrl} target="_blank" rel="noopener">
            {attribution.license}
          </a>{' '}
          协议衍生, 已尽到三项义务:
        </p>
        <ol className="leading-loose pl-6 list-decimal">
          <li><strong>署名</strong>: 每页 footer 与每张导出图均标注"改编自 eternity4719/HowToLiveBetter"</li>
          <li><strong>许可证</strong>: 正文采用 CC BY 4.0, 代码采用 MIT</li>
          <li><strong>同步</strong>: 本站内容每 24 小时自动从上游仓库同步</li>
        </ol>
        <p className="leading-loose mt-3 text-vermillion">
          本站为<strong>非官方衍生作品</strong>, 与原作者无合作关系。
          原书著作权归原作者所有。
        </p>
      </section>

      {/* 免责声明 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3 tracking-guo-sm">免责声明</h2>
        <p className="leading-loose mb-3">
          本项目涉及的内容仅供学习与参考, 不构成医疗、法律或投资建议。
          实际急救、法律事务、医疗决策请咨询当地专业机构。
        </p>
        <p className="leading-loose mb-3">
          书中涉及的政策、法条、补贴标准可能随时间变化。
          本站每 24 小时与上游同步, 但上游也可能不及时。
          请以最新上游仓库为准。
        </p>
        <p className="leading-loose">
          用户使用本站所产生的一切后果, 由用户本人承担。
        </p>
      </section>

      {/* 技术栈 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3 tracking-guo-sm">技术栈</h2>
        <ul className="leading-loose pl-6 list-disc">
          <li>Next.js 14 (App Router) + React Server Components</li>
          <li>Tailwind CSS + CSS Variables</li>
          <li>霞鹜文楷 + EB Garamond + JetBrains Mono</li>
          <li>Framer Motion (克制度使用)</li>
          <li>FlexSearch (客户端搜索)</li>
          <li>Zustand (轻量状态管理)</li>
          <li>Cloudflare Pages (部署)</li>
        </ul>
      </section>

      {/* 反馈 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3 tracking-guo-sm">反馈</h2>
        <p className="leading-loose mb-3">
          内容错误请直接到{' '}
          <a href={attribution.sourceUrl} target="_blank" rel="noopener">
            上游仓库
          </a>{' '}
          提 issue (内容由原作者维护)。
        </p>
        <p className="leading-loose">
          本站问题请到{' '}
          <a href="https://github.com/housheng-lu/housheng-lu/issues" target="_blank" rel="noopener">
            反馈区
          </a>{' '}
          提 issue。
        </p>
      </section>

      {/* 致谢 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3 tracking-guo-sm">致谢</h2>
        <p className="leading-loose mb-2">
          原作 · <a href={attribution.sourceUrl}>{attribution.sourceAuthor}</a>
        </p>
        <p className="leading-loose mb-2">
          字体 · 霞鹜文楷 (LXGW WenKai, OFL 1.1)
        </p>
        <p className="leading-loose mb-2">
          衍生生态 ·{' '}
          <a href="https://howtolivebetter.net">howtolivebetter.net</a>
          {' · '}
          <a href="https://how-to-live-better.com">how-to-live-better.com</a>
          {' · '}
          <a href="https://how2livebetter.net">how2livebetter.net</a>
        </p>
      </section>

      <div className="text-center my-12">
        <Link href="/" style={{ borderBottom: 'none' }}>
          <img src="/logo/seal-end.svg" alt="厚生錄" width={140} height={48} className="mx-auto" />
        </Link>
      </div>

      <div className="juan-end">〔 厚生錄 · 卷末 〕</div>
    </article>
  );
}
