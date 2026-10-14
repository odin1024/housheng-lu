/**
 * 合规信息 - 在 footer 和 about 页使用
 */
export const attribution = {
  source: '高性价比人生指南',
  sourceUrl: 'https://github.com/eternity4719/HowToLiveBetter',
  sourceAuthor: 'eternity4719',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  projectName: '厚生錄',
  projectNameEn: 'HouSheng Lu',
  projectTagline: '七百条生计, 都在案头。',
  projectSubtitle: '《高性价比人生指南》视觉化再刊本',
  isOfficial: false,
  contentMayBeOutdated: true,
} as const;

export function getAttributionText(): string {
  return `本卷依据《${attribution.source}》(${attribution.sourceUrl}) 按 ${attribution.license} 视觉化再刊。本站为非官方衍生作品, 与原作者无合作关系。内容可能过时, 以最新上游为准。`;
}
