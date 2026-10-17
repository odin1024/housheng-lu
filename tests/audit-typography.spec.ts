// 审计: 排版层级 / 组件变体普查 / 404·error·loading — 只读
import { test } from '@playwright/test';
import { BASE, AUDIT_PAGES } from './audit-pages';

test.use({ trace: 'off', screenshot: 'off' });

const TYPO_JS = `(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      sel,
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 20),
      size: cs.fontSize,
      lh: cs.lineHeight,
      lhNum: cs.lineHeight === 'normal' ? null : Number((parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2)),
      weight: cs.fontWeight,
      family: cs.fontFamily.split(',')[0].replace(/"/g, ''),
      color: cs.color,
    };
  };
  const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter((h) => h.getClientRects().length).map((h) => {
    const cs = getComputedStyle(h);
    return {
      lvl: h.tagName,
      size: cs.fontSize,
      lh: cs.lineHeight,
      lhNum: cs.lineHeight === 'normal' ? null : Number((parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2)),
      weight: cs.fontWeight,
      text: (h.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 18),
    };
  });
  return {
    h1: pick('h1'),
    body: pick('.plain-language') || pick('main p'),
    secondary: pick('.text-ink-soft'),
    headings,
  };
})()`;

const CENSUS_JS = `(() => {
  const fam = (cs) => {
    const b = cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor;
    return {
      fs: cs.fontSize, fw: cs.fontWeight,
      pad: cs.paddingTop + '/' + cs.paddingRight,
      border: b,
      bg: cs.backgroundColor,
      color: cs.color,
      radius: cs.borderRadius,
      shadow: cs.boxShadow === 'none' ? 'none' : 'set',
    };
  };
  const sig = (o) => [o.fs, o.fw, o.pad, o.border, o.bg, o.color, o.radius].join(' | ');
  const group = (els, name) => {
    const map = new Map();
    for (const el of els) {
      if (!el.getClientRects().length) continue;
      const o = fam(getComputedStyle(el));
      const k = sig(o);
      if (!map.has(k)) map.set(k, { ...o, n: 0, sample: (el.textContent || el.getAttribute('aria-label') || '').replace(/\\s+/g,' ').trim().slice(0, 16) });
      map.get(k).n++;
    }
    return { name, total: els.length, variants: [...map.values()].sort((a, b) => b.n - a.n) };
  };
  const buttons = [...document.querySelectorAll('button')];
  const links = [...document.querySelectorAll('main a[href]')];
  const badges = [...document.querySelectorAll('span[class*="border"]')];
  const cards = [...document.querySelectorAll('div[class*="bg-bg-alt"][class*="border"], article[class*="border"], li[class*="border"]')];
  // hover 样式覆盖: 统计带 hover: 前缀 class 的元素占比
  const hov = (els) => {
    let withHover = 0, total = 0;
    for (const el of els) {
      if (!el.getClientRects().length) continue;
      total++;
      if (/hover:/.test(el.getAttribute('class') || '')) withHover++;
    }
    return withHover + '/' + total;
  };
  return {
    buttons: group(buttons, 'button'),
    links: group(links, 'main a'),
    badges: group(badges, 'span.border'),
    cards: group(cards, 'card'),
    hoverButtons: hov(buttons),
    hoverLinks: hov(links),
  };
})()`;

for (const [path, label] of AUDIT_PAGES) {
  test(`排版 ${label}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const t: any = await page.evaluate(TYPO_JS);
    const f = (x: any) => (x ? `${x.size}/${x.lhNum ?? x.lh} w${x.weight} ${x.family}` : '-');
    console.log(`\n### 排版 ${label} ${path}`);
    console.log(`  h1        ${f(t.h1)}  "${t.h1?.text ?? ''}"`);
    console.log(`  正文       ${f(t.body)}  "${t.body?.text ?? ''}"`);
    console.log(`  次要       ${f(t.secondary)}  "${t.secondary?.text ?? ''}"`);
    const seen = new Map();
    for (const h of t.headings) {
      const k = h.lvl + ' ' + h.size + '/' + h.lhNum;
      if (!seen.has(k)) seen.set(k, { ...h, n: 0 });
      seen.get(k).n++;
    }
    for (const [k, v] of seen) console.log(`  ${k} x${(v as any).n}  "${(v as any).text}"`);
  });
}

test('组件变体普查 全站', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const agg: Record<string, Map<string, any>> = { button: new Map(), 'main a': new Map(), 'span.border': new Map(), card: new Map() };
  const hovAgg: string[] = [];
  for (const [path, label] of AUDIT_PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const c: any = await page.evaluate(CENSUS_JS);
    hovAgg.push(`${label}: button hover ${c.hoverButtons}, main a hover ${c.hoverLinks}`);
    for (const g of [c.buttons, c.links, c.badges, c.cards]) {
      for (const v of g.variants) {
        const k = [v.fs, v.fw, v.pad, v.border, v.bg, v.color, v.radius].join(' | ');
        if (!agg[g.name]) agg[g.name] = new Map();
        if (!agg[g.name].has(k)) agg[g.name].set(k, { ...v, n: 0, pages: new Set() });
        const rec = agg[g.name].get(k);
        rec.n += v.n;
        rec.pages.add(label);
      }
    }
  }
  for (const name of Object.keys(agg)) {
    const list = [...agg[name].values()].sort((a, b) => b.n - a.n);
    console.log(`\n### 组件变体 [${name}] 共 ${list.length} 种样式组合`);
    for (const v of list.slice(0, 14)) {
      console.log(
        `  x${String(v.n).padEnd(4)} fs=${v.fs} fw=${v.fw} pad=${v.pad} border=${v.border} bg=${v.bg} color=${v.color} radius=${v.radius} 例"${v.sample}" [${[...v.pages].join(',')}]`,
      );
    }
  }
  console.log('\n### hover class 覆盖统计');
  for (const h of hovAgg) console.log(`  ${h}`);
});

test('404 / error / loading 页', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const p of ['/emergency/不存在场景xyz', '/nonexistent-page-xyz', '/book/99-99']) {
    const resp = await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const r: any = await page.evaluate(() => ({
      title: document.title,
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent?.replace(/\s+/g, ' ').trim()),
      hseq: [...document.querySelectorAll('h1,h2,h3,h4')].filter((h) => h.getClientRects().length).map((h) => h.tagName),
      text: (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 110),
      header: !!document.querySelector('header'),
      footer: !!document.querySelector('footer'),
      lang: document.documentElement.lang,
    }));
    console.log(`\n[H ${resp?.status()}] ${p} title="${r.title}" lang=${r.lang}`);
    console.log(`  h1=${JSON.stringify(r.h1)} 标题序列=${r.hseq.join(' ')} header=${r.header} footer=${r.footer}`);
    console.log(`  正文: ${r.text}`);
  }
});

test('字体族解析 (中文回退)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const r: any = await page.evaluate(() => {
    const out: any[] = [];
    for (const el of document.querySelectorAll('h1,h2,p,span,div')) {
      if (!el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      const key = cs.fontFamily;
      if (!out.find((o) => o.family === key)) {
        out.push({
          family: key,
          sample: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 16),
          tag: el.tagName.toLowerCase(),
        });
      }
    }
    return out;
  });
  console.log('\n### 首页实际 font-family 组合');
  for (const o of r) console.log(`  ${o.tag} "${o.sample}" -> ${o.family}`);
  const r2: any = await page.evaluate(() => {
    // 检测是否真的加载了 LXGW WenKai TC / JetBrains Mono 这类未随站分发的字体
    const probe = (fam: string, text: string) => {
      const c = document.createElement('canvas').getContext('2d')!;
      c.font = '32px ' + fam;
      const a = c.measureText(text).width;
      c.font = '32px monospace';
      const b = c.measureText(text).width;
      return { fam, a: Math.round(a), b: Math.round(b) };
    };
    return {
      lxgw: probe('"LXGW WenKai TC"', '厚生錄'),
      jet: probe('"JetBrains Mono"', '01-01'),
      face: [...document.fonts].map((f) => f.family + ':' + f.status),
      faceCount: document.fonts.size,
    };
  });
  console.log(`  文档已注册 @font-face 数=${r2.faceCount} ${JSON.stringify(r2.face)}`);
  console.log(`  画布测量 LXGW WenKai TC vs monospace: ${JSON.stringify(r2.lxgw)} ; JetBrains Mono vs monospace: ${JSON.stringify(r2.jet)}`);
});
