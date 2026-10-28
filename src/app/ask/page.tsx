'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { create as toast } from '@/lib/toast-store';
import { stats } from '@/lib/stats';
import {
  getAskKey,
  setAskKey,
  getAskModel,
  setAskModel,
  getAskBase,
  setAskBase,
  getAskProtocol,
  setAskProtocol,
  getAskMaxTokens,
  setAskMaxTokens,
  clearAskSettings,
  BASE_EXAMPLES,
  MODEL_EXAMPLES,
  type AskProtocol,
} from '@/lib/ask-settings';

interface Citation {
  id: string;
  section: number;
  number: number;
  title: string;
  evidenceLevel: string;
  sourceUrl?: string | null;
}

interface AskResponse {
  answer: string;
  citations: Citation[];
  model: 'ai' | 'search-only';
  fallback?: boolean;
  /** 降级原因: 未配 key / 上游失败 / 模型引用了原书没有的条目 */
  fallbackReason?: 'no-key' | 'upstream' | 'uncited';
  /** true = 原书未直接覆盖该问题, 下列条目只是字面相近 */
  weakMatch?: boolean;
  /** 自定义地址被拒绝的原因 (安全规则/地址校验不通过) */
  baseIgnored?: string;
  /**
   * 命中的「急方」场景 (本站据原书急救章节整理的分步卡, 离线可用)。
   * 与 citations 分开返回, 便于在界面上明确标注它**不是**原书条目。
   */
  emergency?: Array<{
    slug: string;
    title: string;
    desc: string;
    steps: Array<{ n: string; text: string }>;
  }>;
}

/** 降级原因 → 用户可读说明 */
const FALLBACK_TEXT: Record<NonNullable<AskResponse['fallbackReason']>, string> = {
  'no-key': '未配置 AI key, 返回纯检索结果',
  upstream: 'AI 调用失败, 已降级为纯检索结果',
  uncited: 'AI 回答引用了原书没有的条目, 已改为纯检索结果',
};

const EXAMPLE_QUESTIONS = [
  '心脏骤停怎么办?',
  '被骗了钱能追回吗?',
  '体检前要空腹多久?',
  '低钠盐真的有用吗?',
  '刚毕业找工作要注意什么?',
  '怀孕前要补什么?',
  '租房押金不退怎么办?',
  '孩子发烧 38.5 度要吃药吗?',
];

/** 客户端超时: 服务端上游超时是 30s(AI 推理模型较慢), 这里留出余量 */
const CLIENT_TIMEOUT_MS = 35_000;

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ q: string; a: AskResponse }>>([]);
  // 内联错误态: 原来失败只弹 toast, 回答区一片空白, 用户不知道发生了什么也无法重试
  const [error, setError] = useState<{ msg: string; q: string } | null>(null);
  // 出结果后把示例问题收成一行, 需要时再展开 (原来回答后示例就永久消失了)
  const [examplesOpen, setExamplesOpen] = useState(false);

  // AI 设置: 服务端能力 + 访问者自带的 key (BYOK)
  const [aiConfig, setAiConfig] = useState<{
    baseConfigured: boolean;
    serverKey: boolean;
    byok: boolean;
    customBase: boolean;
    models: string[];
    defaultModel: string;
  } | null>(null);
  const [userKey, setUserKey] = useState('');
  const [userModel, setUserModel] = useState('');
  const [userBase, setUserBase] = useState('');
  const [userProtocol, setUserProtocol] = useState<AskProtocol>('openai');
  const [userMaxTokens, setUserMaxTokens] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [baseError, setBaseError] = useState<string | null>(null);
  const [probe, setProbe] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; msg?: string; models?: string[] }>({
    state: 'idle',
  });

  // 读服务端能力 + 本机已存的配置 (clone 下来不改任何文件, 在这里填自己的地址与 key 即可)
  useEffect(() => {
    fetch('/api/ask')
      .then((r) => r.json())
      .then((d) => setAiConfig(d.ai))
      .catch(() => setAiConfig(null));
    setUserKey(getAskKey());
    setUserModel(getAskModel());
    setUserBase(getAskBase());
    setUserProtocol(getAskProtocol());
    setUserMaxTokens(getAskMaxTokens());
  }, []);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const ask = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text) {
      toast.show('请输入问题');
      return;
    }
    if (text.length > 500) {
      toast.show('问题过长（500 字以内）');
      return;
    }

    // 取消上一次仍在途的请求, 并加客户端超时 (否则接口挂住会永远停在"检索中…")
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const timer = setTimeout(() => ac.abort(), CLIENT_TIMEOUT_MS);

    setLoading(true);
    setAnswer(null);
    setError(null);
    try {
      // 自带 key 时随请求发给本站服务器 (只用于这一次调用; 服务端不记录、不存储)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const k = userKey.trim();
      if (k) headers['x-ask-key'] = k;
      if (userModel.trim()) headers['x-ask-model'] = userModel.trim();
      // 自定义地址: 服务端要求"必须同时自带 key", 且会做协议/主机名/DNS 校验
      const b = userBase.trim();
      if (b && k) {
        headers['x-ask-base'] = b;
        headers['x-ask-protocol'] = userProtocol;
      }
      const mt = Number(userMaxTokens);
      if (Number.isInteger(mt) && mt >= 100 && mt <= 4000) headers['x-ask-max-tokens'] = String(mt);
      setBaseError(null);

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: text }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: AskResponse = await res.json();
      if (data.baseIgnored) setBaseError(data.baseIgnored);
      setAnswer(data);
      setHistory((h) => [{ q: text, a: data }, ...h].slice(0, 10));
    } catch (e: unknown) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      const msg = aborted
        ? `请求超时或已取消（${CLIENT_TIMEOUT_MS / 1000} 秒）`
        : e instanceof Error
          ? e.message
          : '未知错误';
      setError({ msg, q: text });
      // 不再弹 toast: 此处已有内联错误块, 两者同时出现是重复噪音
      // (toast 只保留给"请输入问题/问题过长"这类没有内联 UI 的即时校验)
    } finally {
      clearTimeout(timer);
      if (abortRef.current === ac) abortRef.current = null;
      setLoading(false);
    }
  };

  /** 取消当前请求 */
  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  };

  /** 从历史里选一条: 显示答案并滚回结果区, 否则移动端用户看不到内容变化 */
  const showFromHistory = (h: { q: string; a: AskResponse }) => {
    setQuestion(h.q);
    setAnswer(h.a);
    setError(null);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="max-w-narrow mx-auto px-4 md:px-6 py-8">
      <h1 className="title-juanmu">问 卷</h1>
      <p className="title-juanmu-sub">依原书检索回答</p>
      <p className="text-center text-sm text-ink-soft mb-8">
        所有回答只引用《高性价比人生指南》原书 {stats.totalEntries} 条 · 不编造 · 不可信的地方会标「原书未覆盖」
      </p>

      <hr className="zhu-si-lan" />

      {/* 输入区 */}
      <section className="mb-6">
        <label htmlFor="q-input" className="sr-only">
          输入问题
        </label>
        <textarea
          id="q-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              ask();
            }
          }}
          placeholder="问一个生活问题, 例如: 心脏骤停怎么办?"
          rows={3}
          maxLength={500}
          aria-describedby="q-hint"
          className="w-full px-3 py-2 border border-border bg-bg outline-none focus:border-vermillion resize-y"
          disabled={loading}
        />
        <div className="flex items-center justify-between mt-2 gap-3">
          <span id="q-hint" className="text-xs text-ink-soft">
            {question.length}/500 · Ctrl/⌘+Enter 提交
          </span>
          {loading ? (
            <button
              onClick={cancel}
              className="px-6 py-2 border border-border text-ink-soft hover:border-vermillion hover:text-vermillion"
            >
              取消
            </button>
          ) : (
            <button
              onClick={() => ask()}
              disabled={!question.trim()}
              // 禁用时给出原因, 而不是只把按钮变淡 (原来 disabled:opacity-40 对比度仅 1.91:1)
              title={question.trim() ? undefined : '请先输入问题'}
              className="px-6 py-2 bg-seal text-bg hover:opacity-80 disabled:bg-bg disabled:text-ink-soft disabled:border disabled:border-border disabled:cursor-not-allowed"
            >
              问 卷
            </button>
          )}
        </div>
      </section>

      {/* AI 设置: 开源项目里"clone 下来怎么配 key"的入口 (不改文件、不重启) */}
      <section className="mb-6">
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
          aria-controls="ask-settings"
          className="text-xs text-ink-soft hover:text-seal underline underline-offset-2"
        >
          ⚙ AI 设置 ·{' '}
          {!aiConfig
            ? '检测中…'
            : userKey.trim()
              ? '用你自己的 key'
              : !aiConfig.baseConfigured
                ? '未启用（纯检索）'
                : aiConfig.serverKey
                  ? '本站已启用'
                  : '可填自己的 key 启用'}
        </button>

        {settingsOpen && (
          <div id="ask-settings" className="mt-3 p-4 border border-border bg-bg-alt text-sm">
            {!aiConfig ? (
              <p className="text-ink-soft">正在读取本站的 AI 配置…</p>
            ) : !aiConfig.baseConfigured ? (
              <>
                <p className="mb-2">
                  本站当前为<strong>纯检索模式</strong>：所有回答都从原书 {stats.totalEntries} 条里检索，
                  不调用任何模型。功能完整，只是没有 AI 润色。
                </p>
                <p className="text-xs text-ink-soft leading-relaxed">
                  <strong>自建部署想启用 AI</strong>：在项目根目录建 <code>.env.local</code>，填两项后重启即可 ——
                  <br />
                  <code>ASK_API_BASE=https://你的中转站/v1</code>（OpenAI 兼容接口）
                  <br />
                  <code>ASK_API_KEY=sk-…</code>（或留空，让访问者自带 key）
                  <br />
                  详见仓库 <code>.env.example</code> 与 README。
                </p>
              </>
            ) : (
              <>
                <p className="mb-3 text-xs text-ink-soft leading-relaxed">
                  本站默认用部署者配置的模型服务（具体地址不在此显示）。你也可以填<strong>自己的配置</strong>
                  —— 厂商官方 API 或其它中转站都行，此时按你自己的额度计费。
                  只填 key 会走本站默认地址；<strong>填了地址就必须同时填 key</strong>。
                </p>

                <label htmlFor="ask-protocol" className="block mb-1 font-bold">
                  ① 接口协议
                </label>
                <select
                  id="ask-protocol"
                  value={userProtocol}
                  onChange={(e) => setUserProtocol(e.target.value as AskProtocol)}
                  className="w-full px-3 py-2 border border-border bg-bg outline-none focus:border-vermillion text-xs mb-3"
                >
                  <option value="openai">OpenAI 兼容（/chat/completions，多数中转站与厂商）</option>
                  <option value="anthropic">Anthropic 官方（/messages）</option>
                </select>

                <label htmlFor="ask-base" className="block mb-1 font-bold">
                  ② 接口地址（留空 = 用本站默认地址）
                </label>
                <input
                  id="ask-base"
                  type="url"
                  autoComplete="off"
                  spellCheck={false}
                  list="ask-base-list"
                  value={userBase}
                  onChange={(e) => setUserBase(e.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full px-3 py-2 border border-border bg-bg outline-none focus:border-vermillion font-mono text-xs mb-1"
                />
                <datalist id="ask-base-list">
                  {BASE_EXAMPLES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </datalist>
                <p className="text-[11px] text-ink-soft mb-3 leading-relaxed">
                  常用（点输入框可选）：{BASE_EXAMPLES.map((b) => b.label).join(' · ')}
                </p>

                <label htmlFor="ask-key" className="block mb-1 font-bold">
                  ③ API Key
                </label>
                <input
                  id="ask-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={userKey}
                  onChange={(e) => setUserKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-border bg-bg outline-none focus:border-vermillion font-mono text-xs mb-3"
                />

                <label htmlFor="ask-model" className="block mb-1 font-bold">
                  ④ 模型名
                </label>
                <input
                  id="ask-model"
                  autoComplete="off"
                  spellCheck={false}
                  list="ask-model-list"
                  value={userModel}
                  onChange={(e) => setUserModel(e.target.value)}
                  placeholder={aiConfig.defaultModel}
                  className="w-full px-3 py-2 border border-border bg-bg outline-none focus:border-vermillion font-mono text-xs mb-1"
                />
                <datalist id="ask-model-list">
                  {[...new Set([...aiConfig.models, ...MODEL_EXAMPLES])].map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <p className="text-[11px] text-ink-soft mb-3">
                  本站默认模型：{aiConfig.models.join(' / ')}
                </p>

                <label htmlFor="ask-maxtokens" className="block mb-1 font-bold">
                  ⑤ 最大回答长度 max_tokens（可留空）
                </label>
                <input
                  id="ask-maxtokens"
                  type="number"
                  min={100}
                  max={4000}
                  step={100}
                  autoComplete="off"
                  value={userMaxTokens}
                  onChange={(e) => setUserMaxTokens(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2 border border-border bg-bg outline-none focus:border-vermillion font-mono text-xs mb-1"
                />
                <p className="text-[11px] text-ink-soft mb-3 leading-relaxed">
                  推理模型会把 token 先花在思考上，给太小会出现<strong>空回答</strong>；建议不低于 1000。
                  留空用服务端默认。
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => {
                      setAskKey(userKey);
                      setAskModel(userModel);
                      setAskBase(userBase);
                      setAskProtocol(userProtocol);
                      setAskMaxTokens(userMaxTokens);
                      toast.show(userKey.trim() ? '已保存到本机浏览器' : '已清除本机 key');
                    }}
                    className="px-3 py-1.5 border border-seal text-seal hover:bg-seal hover:text-bg transition-colors"
                    style={{ borderBottom: '1px solid var(--color-seal)' }}
                  >
                    保存到本机
                  </button>
                  <button
                    onClick={async () => {
                      setProbe({ state: 'busy' });
                      try {
                        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                        if (userKey.trim()) headers['x-ask-key'] = userKey.trim();
                        if (userModel.trim()) headers['x-ask-model'] = userModel.trim();
                        if (userBase.trim() && userKey.trim()) {
                          headers['x-ask-base'] = userBase.trim();
                          headers['x-ask-protocol'] = userProtocol;
                        }
                        const r = await fetch('/api/ask/probe', { method: 'POST', headers });
                        const d = await r.json();
                        setProbe({ state: d.ok ? 'ok' : 'fail', msg: d.note || d.error, models: d.models });
                      } catch (e) {
                        setProbe({ state: 'fail', msg: e instanceof Error ? e.message : '请求失败' });
                      }
                    }}
                    disabled={probe.state === 'busy'}
                    className="px-3 py-1.5 border border-border text-ink-soft hover:border-vermillion hover:text-vermillion disabled:opacity-50"
                  >
                    {probe.state === 'busy' ? '测试中…' : '测试连接 / 取模型列表'}
                  </button>
                  <button
                    onClick={() => {
                      clearAskSettings();
                      setUserKey('');
                      setUserModel('');
                      setUserBase('');
                      setUserProtocol('openai');
                      setUserMaxTokens('');
                      setBaseError(null);
                      setProbe({ state: 'idle' });
                      toast.show('已清除');
                    }}
                    className="px-3 py-1.5 border border-border text-ink-soft hover:border-vermillion hover:text-vermillion"
                  >
                    清除
                  </button>
                </div>

                {probe.state !== 'idle' && probe.state !== 'busy' && (
                  <div className="mb-3 text-xs">
                    <p className={probe.state === 'ok' ? 'text-seal' : 'text-vermillion'}>
                      {probe.state === 'ok' ? '✅ ' : '❌ '}
                      {probe.msg}
                    </p>
                    {probe.models && probe.models.length > 0 && (
                      <p className="mt-1 text-ink-soft leading-relaxed">
                        可用模型（点一下填入）：
                        {probe.models.slice(0, 30).map((m) => (
                          <button
                            key={m}
                            onClick={() => setUserModel(m)}
                            className="mr-1 mb-1 px-1.5 py-0.5 border border-border hover:border-seal hover:text-seal font-mono"
                          >
                            {m}
                          </button>
                        ))}
                      </p>
                    )}
                  </div>
                )}

                {baseError && (
                  <p className="mb-3 px-3 py-2 border-l-2 border-vermillion bg-bg text-xs text-vermillion">
                    自定义地址未生效：{baseError}
                  </p>
                )}

                <p className="text-xs text-ink-soft leading-relaxed">
                  安全说明：以上配置只保存在<strong>你自己的浏览器</strong>（localStorage），
                  随提问发给本站服务器仅用于这一次调用 —— 服务端不记录、不存储、不回传，也不会显示部署者的地址。
                  自定义地址<strong>必须同时填你自己的 key</strong>（否则本站会拿部署者的 key 去请求你给的地址），
                  且<strong>不允许指向本机/内网/云元数据地址</strong>；公开部署可用
                  <code className="mx-1">ASK_ALLOW_CUSTOM_BASE=0</code>彻底关闭自定义地址。
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* 示例问题: 首次直接展示; 出结果后收成一行"换个问题试试" */}
      {(!answer && !error && history.length === 0) || examplesOpen ? (
        <section className="mb-6">
          <p className="text-sm text-ink-soft mb-3">或试试:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setExamplesOpen(false);
                  setQuestion(q);
                  ask(q);
                }}
                disabled={loading}
                className="text-sm px-3 py-1 border border-border text-ink-soft hover:border-seal hover:text-seal"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      ) : (
        answer &&
        !loading && (
          <p className="mb-6">
            <button
              onClick={() => setExamplesOpen(true)}
              className="text-xs text-ink-soft hover:text-seal underline underline-offset-2"
            >
              换个问题试试 →
            </button>
          </p>
        )
      )}

      {/* 错误态 (常驻 role=alert 容器: live region 必须先于内容存在才会被播报) */}
      <div role="alert">
        {error && !loading && (
          <div className="mb-6 p-4 border border-vermillion bg-bg-alt">
            <p className="text-sm font-bold text-vermillion mb-2">没能取到回答: {error.msg}</p>
            <p className="text-xs text-ink-soft leading-relaxed mb-3">
              常见原因: 网络中断 · 同一 IP 每分钟超过 10 次 · 服务暂时不可用。
              本页所有回答都来自原书检索, 也可以直接用
              <Link href="/explore" prefetch={false} className="text-vermillion underline underline-offset-2 mx-1">
                检索器
              </Link>
              自己查原文。
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <button
                onClick={() => ask(error.q)}
                className="px-4 py-2 border border-seal text-seal hover:bg-seal hover:text-bg transition-colors"
                style={{ borderBottom: '1px solid var(--color-seal)' }}
              >
                重试
              </button>
              <Link
                href="/emergency"
                className="px-4 py-2 border border-vermillion text-vermillion hover:bg-vermillion hover:text-bg transition-colors"
                style={{ borderBottom: '1px solid var(--color-vermillion)' }}
              >
                急方（离线可用）
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 结果区: 单一常驻 live region 包住 加载中/回答, 避免两个 region 交替挂载导致漏播 */}
      <div ref={resultRef} aria-live="polite" aria-atomic="false">
        {/* 加载中 */}
        {loading && (
          <div className="text-center py-12 text-ink-soft">
            <p>正在翻阅 {stats.totalEntries} 条原书…</p>
            {/* AI 模式走推理模型, 实测一次回答 10-15 秒, 明确告知避免用户以为卡住 */}
            <p className="text-xs mt-2">若本站启用了 AI, 生成回答需数秒至十余秒, 请稍候</p>
          </div>
        )}

        {/* 回答 */}
        {answer && !loading && (
          <section className="mb-6" data-testid="ask-result">
            {/* 急方场景: 危及生命的问题最该先看到分步卡 (离线可用)
                明确标注"本站整理、非原书条目", 与下面的原书引用区分开 */}
            {answer.emergency && answer.emergency.length > 0 && (
              <div className="mb-6 border border-vermillion">
                {answer.emergency.map((s) => (
                  <div key={s.slug} className="p-4 border-b border-border last:border-b-0">
                    <div className="flex flex-wrap items-baseline gap-2 mb-2">
                      <span className="text-vermillion font-bold" style={{ fontFamily: 'var(--font-zh-heading)' }}>
                        急方 · {s.title}
                      </span>
                      <span className="text-xs text-ink-soft">
                        本站据原书急救章节整理 · 离线可用 · 非原书条目
                      </span>
                    </div>
                    <ol className="list-none p-0 m-0 space-y-1 mb-3">
                      {s.steps.map((st) => (
                        <li key={st.n} className="flex gap-2 text-sm">
                          <span className="text-vermillion flex-shrink-0">〔{st.n}〕</span>
                          <span>{st.text}</span>
                        </li>
                      ))}
                    </ol>
                    <Link
                      href={`/emergency/${encodeURIComponent(s.slug)}`}
                      className="inline-block text-sm px-3 py-1.5 border border-vermillion text-vermillion hover:bg-vermillion hover:text-bg transition-colors"
                      style={{ borderBottom: '1px solid var(--color-vermillion)' }}
                    >
                      打开急救卡（可离线）→
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* 答案 */}
            <div className="p-6 border border-border bg-bg-alt">
              {/* 原书未直接覆盖时明确说明 —— 页面承诺「不可信的地方会标原书未覆盖」 */}
              {answer.weakMatch && (
                <p className="mb-4 px-3 py-2 border-l-2 border-vermillion bg-bg text-sm text-vermillion">
                  原书未直接覆盖这个问题。下面的条目只是按字面检索到的相近内容, 未必切题。
                </p>
              )}
              <div className="flex items-center gap-2 mb-4 text-xs text-ink-soft">
                {answer.model === 'ai' ? (
                  <span className="px-2 py-0.5 border border-seal text-seal">AI 引用</span>
                ) : (
                  <span className="px-2 py-0.5 border border-ink-soft text-ink-soft">原文检索</span>
                )}
                {answer.fallback && (
                  <span className="text-xs">
                    （{answer.fallbackReason ? FALLBACK_TEXT[answer.fallbackReason] : '已降级为纯检索结果'}
                    {answer.fallbackReason === 'upstream' && userKey.trim() ? '，请检查你填的 key 是否有效或额度不足' : ''}）
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap leading-loose text-base">{answer.answer}</div>
            </div>

            {/* 引用列表 */}
            {answer.citations.length > 0 && (
              <div className="mt-6">
                <h3
                  className="text-lg font-bold mb-3 tracking-guo-sm"
                  style={{ fontFamily: 'var(--font-zh-heading)' }}
                >
                  {/* AI 模式下这张表是"生成回答时提供给模型的条目", 并非逐条引用;
                      纯检索模式下正文就是逐条列举, 所以叫"引用"才准确 */}
                  {answer.model === 'ai' ? '参考条目' : '引用'} ({answer.citations.length})
                </h3>
                <ul className="space-y-2">
                  {answer.citations.map((c) => (
                    // 结构与 EntryCard 一致: 条目链接与出处链接必须是**兄弟**,
                    // 不能把一个 <a> 嵌进另一个 <a> (非法 HTML, 且点击行为会互相抢)
                    <li key={c.id} className="border border-border bg-bg hover:border-seal">
                      <Link href={`/book/${c.id}`} className="block p-3 no-underline">
                        <div className="flex items-baseline gap-2">
                          <span className="text-seal font-mono text-xs">{c.id}</span>
                          <span className="text-xs px-1 border border-vermillion text-vermillion">
                            {c.evidenceLevel} 级
                          </span>
                          <span className="text-xs text-ink-soft">
                            第 {c.section} 节 · 第 {c.number} 条
                          </span>
                        </div>
                        <div className="font-bold mt-1">{c.title}</div>
                      </Link>
                      {c.sourceUrl && (
                        <div className="px-3 pb-2 text-xs">
                          <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noopener"
                            className="text-ink-soft hover:text-vermillion"
                          >
                            原书出处 ↗
                          </a>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 免责声明 */}
            <p className="mt-6 text-xs text-ink-soft italic text-center">
              ⚠️ 本回答由原书检索生成, 实际请咨询当地专业机构
            </p>
          </section>
        )}
      </div>

      {/* 历史 */}
      {history.length > 1 && !loading && (
        <section className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-bold mb-3 text-ink-soft tracking-guo-sm">问卷历史</h3>
          <ul className="space-y-2">
            {history.slice(1).map((h, i) => (
              <li key={i}>
                <button
                  onClick={() => showFromHistory(h)}
                  className="w-full text-left text-sm text-ink-soft hover:text-seal"
                >
                  {h.q}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="juan-end">〔 问 卷 · 终 〕</div>

      {/* 隐私说明: 此前全站没有任何隐私告知, 而问答在启用 AI 时会把问题发给第三方模型 */}
      <p className="text-xs text-ink-soft leading-relaxed mt-4 max-w-narrow mx-auto">
        隐私说明: 你的问题只用于本次检索, 本站不存储问题与回答。
        若本站启用了 AI, 问题会发送给<strong>第三方模型服务</strong>处理（本站不自建模型; 不点名具体供应商, 因为它可配置更换）。
        若你在「AI 设置」里填了自己的 key, 该 key 只存在你的浏览器并随请求发送, 服务端不记录、不存储、不回传 ——
        是否走了 AI, 看回答上方的标签即可（「AI 引用」= 经过模型, 「原文检索」= 纯本地检索, 不出站）。
        「我的清单」只存在你自己的浏览器里, 不上传服务器; 本站不使用追踪 Cookie, 也不接入任何第三方统计脚本。
      </p>
    </div>
  );
}
