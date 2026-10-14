import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 竹纸黄
        bg: 'var(--color-bg)',
        // 旧书页
        'bg-alt': 'var(--color-bg-alt)',
        // 墨色
        ink: 'var(--color-ink)',
        // 淡墨
        'ink-soft': 'var(--color-ink-soft)',
        // 朱砂
        vermillion: 'var(--color-vermillion)',
        // 靛蓝
        indigo: 'var(--color-indigo)',
        // 印泥红
        seal: 'var(--color-seal)',
        // 旧纸边
        border: 'var(--color-border)',
      },
      fontFamily: {
        zh: ['var(--font-zh-body)'],
        'zh-heading': ['var(--font-zh-heading)'],
        en: ['var(--font-en-body)'],
        'en-heading': ['var(--font-en-heading)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'display': ['72px', { lineHeight: '1.1', letterSpacing: '0.05em' }],
      },
      letterSpacing: {
        'guo': '0.5em',  // 仿古籍字距
      },
      transitionTimingFunction: {
        fold: 'cubic-bezier(0.7, 0, 0.3, 1)',
        stamp: 'cubic-bezier(0.6, -0.1, 0.3, 1.2)',
      },
      maxWidth: {
        'narrow': '720px',
        'base': '960px',
        'wide': '1200px',
      },
      backgroundImage: {
        'paper': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cline x1='0' y1='0' x2='120' y2='120' stroke='%23E8DCC0' stroke-width='0.5' opacity='0.5'/%3E%3Cline x1='120' y1='0' x2='0' y2='120' stroke='%23E8DCC0' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
