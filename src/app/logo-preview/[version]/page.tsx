// Logo 设计方案预览页 - 在 src/app/ 下才是 Next.js 路由
import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].map((v) => ({ version: v }));
}

// 只允许白名单里的版本, 其余真 404 (避免 loading.tsx 造成的软 404)
export const dynamicParams = false;

export default async function LogoPreview({ params }: { params: { version: string } }) {
  const fileMap: Record<string, string> = {
    v1: 'seal-square.svg',
    v2: 'design-2-vertical.svg',
    v3: 'design-3-horizontal.svg',
    v4: 'design-4-minimal.svg',
    v5: 'design-5-classic.svg',
    v6: 'design-6-combined.svg',
  };
  const file = fileMap[params.version];
  if (!file) notFound();
  const svgPath = path.join(process.cwd(), 'public', 'logo', file);
  let svg = '';
  try {
    svg = await fs.promises.readFile(svgPath, 'utf-8');
  } catch {
    return (
      <div style={{ padding: 40, fontFamily: 'serif', color: '#2A2418', background: '#F2E8D5', minHeight: '100vh' }}>
        <h1>设计 {params.version} - {file} 还没创建</h1>
      </div>
    );
  }
  const innerSvg = svg
    .replace(/<\?xml.*?\?>/, '')
    .replace(/width="\d+"/, '')
    .replace(/height="\d+"/, '')
    .replace(/<svg([^>]*)>/, '<svg$1 style="width:100%;height:100%;display:block">');
  return (
    <div
      style={{
        background: '#F2E8D5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: 24,
      }}
    >
      <h1
        style={{
          fontFamily: '"LXGW WenKai TC", "Songti SC", serif',
          color: '#2A2418',
          fontSize: 28,
          fontWeight: 700,
          margin: 0,
        }}
      >
        厚生錄 Logo 方案 {params.version.toUpperCase()}
      </h1>
      <p
        style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          color: '#6B5D4A',
          fontSize: 14,
          fontStyle: 'italic',
          margin: 0,
        }}
      >
        {descriptions[params.version] || ''}
      </p>
      <div
        style={{
          width: 300,
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        dangerouslySetInnerHTML={{ __html: innerSvg }}
      />
    </div>
  );
}

const descriptions: Record<string, string> = {
  v1: '当前方案 - 方形三字均匀分布',
  v2: '竖排印章 - 仿传统朱印 100×140',
  v3: '居中横排 - 双线椭圆印章 130×60',
  v4: '极简现代 - 细线方印 + 角块装饰',
  v5: '古典线装 - 古书装订孔 + 边线',
  v6: '组合版 - 印章 + 英文 slogan 一体',
};
