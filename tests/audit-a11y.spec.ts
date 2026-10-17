// 审计: 无障碍 (标题层级 / alt / label / aria-live / 键盘 / focus) — 只读
import { test } from '@playwright/test';
import { BASE, AUDIT_PAGES } from './audit-pages';

const A11Y_JS = `(() => {
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter((h) => h.getClientRects().length)
    .map((h) => ({
      lvl: Number(h.tagName[1]),
      text: (h.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40),
      cls: (h.getAttribute('class') || '').slice(0, 50),
    }));
  const imgs = [...document.querySelectorAll('img')].map((i) => ({
    src: (i.getAttribute('src') || '').slice(0, 45),
    alt: i.getAttribute('alt'),
    hasAlt: i.hasAttribute('alt'),
    w: Math.round(i.getBoundingClientRect().width),
    h: Math.round(i.getBoundingClientRect().height),
    visible: !!i.getClientRects().length,
  }));
  const svgs = [...document.querySelectorAll('svg')].map((s) => ({
    role: s.getAttribute('role'),
    label: s.getAttribute('aria-label'),
    hidden: s.getAttribute('aria-hidden'),
    title: !!s.querySelector('title'),
    inLink: !!s.closest('a,button'),
    visible: !!s.getClientRects().length,
  }));
  const inputs = [...document.querySelectorAll('input,select,textarea')]
    .filter((i) => i.type !== 'hidden')
    .map((i) => {
      const id = i.getAttribute('id');
      const lbl = id ? document.querySelector('label[for="' + CSS.escape(id) + '"]') : null;
      const wrap = i.closest('label');
      const cs = getComputedStyle(i);
      return {
        tag: i.tagName.toLowerCase(),
        type: i.getAttribute('type') || '',
        id: id,
        name: i.getAttribute('name'),
        ph: i.getAttribute('placeholder'),
        hasLabel: !!(lbl || wrap),
        ariaLabel: i.getAttribute('aria-label'),
        ariaLabelledby: i.getAttribute('aria-labelledby'),
        display: cs.display,
        visible: !!i.getClientRects().length,
        cls: (i.getAttribute('class') || '').slice(0, 45),
      };
    });
  const live = [...document.querySelectorAll('[aria-live],[role="status"],[role="alert"],[role="log"]')].map((e) => ({
    tag: e.tagName.toLowerCase(),
    live: e.getAttribute('aria-live'),
    role: e.getAttribute('role'),
    cls: (e.getAttribute('class') || '').slice(0, 45),
    text: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30),
    visible: !!e.getClientRects().length,
  }));
  const btnsNoName = [...document.querySelectorAll('button,[role="button"],a[href]')]
    .filter((b) => b.getClientRects().length)
    .filter((b) => {
      const t = (b.textContent || '').replace(/\\s+/g, '').trim();
      const aria = b.getAttribute('aria-label') || b.getAttribute('title');
      const imgAlt = b.querySelector('img[alt]:not([alt=""])');
      return !t && !aria && !imgAlt;
    })
    .map((b) => ({
      tag: b.tagName.toLowerCase(),
      cls: (b.getAttribute('class') || '').slice(0, 45),
      html: b.outerHTML.slice(0, 90),
    }));
  const lang = document.documentElement.getAttribute('lang');
  const focusables = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter((e) => e.getClientRects().length).length;
  const negTab = [...document.querySelectorAll('[tabindex]')].map((e) => ({
    t: e.getAttribute('tabindex'),
    tag: e.tagName.toLowerCase() + '.' + (e.getAttribute('class') || '').split(/\\s+/).slice(0,2).join('.'),
  })).filter((x) => Number(x.t) > 0);
  return { lang, headings, imgs, svgs, inputs, live, btnsNoName, focusables, negTab };
})()`;

for (const [path, label] of AUDIT_PAGES) {
  test(`A11y ${label} ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const r: any = await page.evaluate(A11Y_JS);

    console.log(`\n### A11y ${label} ${path} | lang="${r.lang}" | 可聚焦 ${r.focusables}`);
    const h1s = r.headings.filter((h: any) => h.lvl === 1);
    console.log(`  h1 数量: ${h1s.length}${h1s.length ? ' -> ' + h1s.map((h: any) => h.text).join(' | ') : ''}`);
    console.log(`  标题序列: ${r.headings.map((h: any) => 'h' + h.lvl).join(' ')}`);
    // 层级跳跃检测
    const seq = r.headings.map((h: any) => h.lvl);
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] - seq[i - 1] > 1) {
        console.log(`  !! 层级跳跃 h${seq[i - 1]} -> h${seq[i]} : "${r.headings[i].text}"`);
      }
    }
    if (!seq.length) console.log('  !! 无任何标题');
    const noAlt = r.imgs.filter((i: any) => !i.hasAlt);
    const emptyAlt = r.imgs.filter((i: any) => i.alt === '');
    console.log(`  img 共 ${r.imgs.length} | 缺 alt 属性 ${noAlt.length} | alt=""(装饰) ${emptyAlt.length}`);
    for (const i of noAlt) console.log(`     !! 无 alt: ${i.src}`);
    for (const i of r.imgs.filter((i: any) => i.alt)) console.log(`     alt="${i.alt}" ${i.src}`);
    const badSvg = r.svgs.filter((s: any) => !s.hidden && !s.label && !s.role && !s.title);
    console.log(`  svg 共 ${r.svgs.length} | 无 aria-hidden/role/label ${badSvg.length}`);
    const badInputs = r.inputs.filter((i: any) => !i.hasLabel && !i.ariaLabel && !i.ariaLabelledby);
    console.log(`  表单控件 ${r.inputs.length} | 无 label/aria-label ${badInputs.length}`);
    for (const i of badInputs) console.log(`     !! ${i.tag}[type=${i.type}] id=${i.id} name=${i.name} ph="${i.ph}" vis=${i.visible} ${i.cls}`);
    console.log(`  aria-live/status/alert 区域: ${r.live.length}`);
    for (const l of r.live) console.log(`     live=${l.live} role=${l.role} vis=${l.visible} "${l.text}" ${l.cls}`);
    console.log(`  无可访问名按钮/链接: ${r.btnsNoName.length}`);
    for (const b of r.btnsNoName) console.log(`     !! ${b.tag} ${b.cls} :: ${b.html}`);
    console.log(`  tabindex>0 (反模式): ${r.negTab.length}`);
    for (const t of r.negTab) console.log(`     !! tabindex=${t.t} ${t.tag}`);
  });
}
