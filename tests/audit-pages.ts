// 审计共享常量 (非 .spec, Playwright 不会当作用例收集)
export const BASE = 'http://127.0.0.1:3000';

export const AUDIT_PAGES: Array<[string, string]> = [
  ['/', '首页'],
  ['/explore', '检索'],
  ['/ask', '问卷'],
  ['/emergency', '急方'],
  ['/emergency/心脏骤停', '急方详情'],
  ['/matrix', '矩阵'],
  ['/poster', '海报'],
  ['/my', '我的'],
  ['/about', '卷末'],
];
