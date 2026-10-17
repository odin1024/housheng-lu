/**
 * 问卷页的"自带 key"(BYOK) 设置 —— 只存在访问者自己的浏览器里
 *
 * 设计要点:
 *  - 只存 **key 与模型名**, 不存 base URL: base 是部署决策, 由服务端 env 决定;
 *    若允许前端传 base, /api/ask 就成了任意 URL 的代理 (SSRF)。
 *  - 存储失败 (隐私模式/配额满) 不能让页面崩, 一律 try/catch。
 */

const KEY_STORAGE = 'housheng-lu:ask-key:v1';
const MODEL_STORAGE = 'housheng-lu:ask-model:v1';
const BASE_STORAGE = 'housheng-lu:ask-base:v1';
const PROTOCOL_STORAGE = 'housheng-lu:ask-protocol:v1';
const MAXTOKENS_STORAGE = 'housheng-lu:ask-maxtokens:v1';

/** 常用 OpenAI 兼容地址 (只是输入建议, 不限制填写) */
export const BASE_EXAMPLES = [
  { label: 'DeepSeek 官方', value: 'https://api.deepseek.com/v1' },
  { label: 'OpenAI 官方', value: 'https://api.openai.com/v1' },
  { label: 'Moonshot (Kimi)', value: 'https://api.moonshot.cn/v1' },
  { label: '智谱 GLM', value: 'https://open.bigmodel.cn/api/paas/v4' },
  { label: '阿里云百炼', value: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { label: '火山方舟', value: 'https://ark.cn-beijing.volces.com/api/v3' },
];

/** 常用模型名 (输入建议) */
export const MODEL_EXAMPLES = [
  'deepseek-v4.1-flash',
  'glm-5.3-flash',
  'deepseek-chat',
  'gpt-4o-mini',
  'moonshot-v1-8k',
];

function read(name: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(name) || '';
  } catch {
    return '';
  }
}

function write(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) localStorage.setItem(name, value);
    else localStorage.removeItem(name);
  } catch {
    /* 隐私模式/配额满时静默失败: 本次会话仍可用, 只是不持久化 */
  }
}

export function getAskKey(): string {
  return read(KEY_STORAGE);
}

export function setAskKey(key: string): void {
  write(KEY_STORAGE, key.trim());
}

export function getAskModel(): string {
  return read(MODEL_STORAGE);
}

export function setAskModel(model: string): void {
  write(MODEL_STORAGE, model.trim());
}

export function getAskBase(): string {
  return read(BASE_STORAGE);
}

export function setAskBase(base: string): void {
  write(BASE_STORAGE, base.trim());
}

export type AskProtocol = 'openai' | 'anthropic';

export function getAskProtocol(): AskProtocol {
  return read(PROTOCOL_STORAGE) === 'anthropic' ? 'anthropic' : 'openai';
}

export function setAskProtocol(p: AskProtocol): void {
  write(PROTOCOL_STORAGE, p);
}

/** 最大回答长度 (max_tokens); 空字符串 = 用服务端默认 */
export function getAskMaxTokens(): string {
  return read(MAXTOKENS_STORAGE);
}

export function setAskMaxTokens(v: string): void {
  write(MAXTOKENS_STORAGE, v.trim());
}

export function clearAskSettings(): void {
  write(KEY_STORAGE, '');
  write(MODEL_STORAGE, '');
  write(BASE_STORAGE, '');
  write(PROTOCOL_STORAGE, '');
  write(MAXTOKENS_STORAGE, '');
}
