import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '厚生錄 · HouSheng Lu',
    short_name: '厚生錄',
    description: '《高性价比人生指南》视觉化再刊本',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2E8D5',
    theme_color: '#B73229',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
