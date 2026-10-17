import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        'bg-alt': 'var(--color-bg-alt)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        vermillion: 'var(--color-vermillion)',
        indigo: 'var(--color-indigo)',
        seal: 'var(--color-seal)',
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
        display: ['72px', { lineHeight: '1.1', letterSpacing: '0.05em' }],
      },
      letterSpacing: {
        guo: '0.5em',
      },
      transitionTimingFunction: {
        fold: 'cubic-bezier(0.7, 0, 0.3, 1)',
        stamp: 'cubic-bezier(0.6, -0.1, 0.3, 1.2)',
      },
      maxWidth: {
        narrow: '720px',
        base: '960px',
        wide: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
