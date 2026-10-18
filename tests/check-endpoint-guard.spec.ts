// 自定义地址的安全校验 (纯函数, 不走网络): SSRF 拦截面
import { test, expect } from '@playwright/test';
import { parseCustomBase, isBlockedHost } from '../src/lib/ask-endpoint';

test('合法地址: 公网 https/http 放行', () => {
  for (const ok of [
    'https://api.openai.com/v1',
    'https://api.deepseek.com/v1',
    'http://api.example.com:8080/v1',
    // 注意: 这里不要写具体部署所用的中转站域名 —— 公开仓库里没必要暴露部署者的供应商
    'https://api.some-other-relay.example/v1',
    'https://generativelanguage.googleapis.com/v1beta/openai',
  ]) {
    const r = parseCustomBase(ok);
    console.log(`${ok} → ${r.ok ? '放行' : '拒绝: ' + r.reason}`);
    expect(r.ok, `${ok} 应放行`).toBe(true);
  }
});

test('协议与格式: 非 http(s)、带凭据、空值一律拒绝', () => {
  for (const bad of [
    '',
    '   ',
    'not-a-url',
    'ftp://api.example.com/v1',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'gopher://api.example.com/',
    'https://user:pass@api.example.com/v1',
  ]) {
    const r = parseCustomBase(bad);
    console.log(`"${bad}" → ${r.ok ? '❌ 竟然放行' : '拒绝: ' + r.reason}`);
    expect(r.ok, `"${bad}" 应拒绝`).toBe(false);
  }
});

test('SSRF: 本机/内网/链路本地/云元数据地址必须拒绝', () => {
  const blocked = [
    'http://localhost:3000/v1',
    'http://127.0.0.1:3000/v1',
    'http://127.1.2.3/v1',
    'http://10.0.0.5/v1',
    'http://172.16.1.1/v1',
    'http://172.31.255.254/v1',
    'http://192.168.1.1/v1',
    'http://169.254.169.254/latest/meta-data',
    'http://100.64.0.1/v1',
    'http://0.0.0.0/v1',
    'http://metadata.google.internal/computeMetadata/v1',
    'http://foo.internal/v1',
    'http://foo.local/v1',
    'http://intranet/v1',
    'http://[::1]:8080/v1',
    'http://[fe80::1]/v1',
    'http://[fd00::1]/v1',
    'http://[::ffff:127.0.0.1]/v1',
  ];
  for (const bad of blocked) {
    const r = parseCustomBase(bad);
    console.log(`${bad} → ${r.ok ? '❌ 竟然放行' : '拒绝: ' + r.reason}`);
    expect(r.ok, `${bad} 应拒绝`).toBe(false);
  }
});

test('SSRF: 花式 IP 写法 (十进制/八进制/十六进制) 也要拦住', () => {
  // WHATWG URL 会把 0x7f000001 / 0177.0.0.1 / 2130706433 归一化成 127.0.0.1;
  // 这里断言"无论归一化发生在哪一层, 最终都必须被拒绝"
  for (const bad of [
    'http://2130706433/v1',
    'http://0x7f000001/v1',
    'http://0177.0.0.1/v1',
    'http://0x7f.0.0.1/v1',
    'http://3232235777/v1', // 192.168.1.1
  ]) {
    const r = parseCustomBase(bad);
    console.log(`${bad} → host=${(() => { try { return new URL(bad).hostname; } catch { return '解析失败'; } })()} → ${r.ok ? '❌ 竟然放行' : '拒绝'}`);
    expect(r.ok, `${bad} 应拒绝`).toBe(false);
  }
});

test('isBlockedHost 直接判定 (含边界值)', () => {
  // 边界: 172.15/172.32 不是内网, 192.169 不是内网
  expect(isBlockedHost('172.15.0.1')).toBe(false);
  expect(isBlockedHost('172.32.0.1')).toBe(false);
  expect(isBlockedHost('192.169.0.1')).toBe(false);
  expect(isBlockedHost('11.0.0.1')).toBe(false);
  expect(isBlockedHost('8.8.8.8')).toBe(false);
  // 内网/保留
  expect(isBlockedHost('172.16.0.1')).toBe(true);
  expect(isBlockedHost('172.31.255.255')).toBe(true);
  expect(isBlockedHost('192.168.0.1')).toBe(true);
  expect(isBlockedHost('169.254.169.254')).toBe(true);
  expect(isBlockedHost('127.0.0.1')).toBe(true);
  expect(isBlockedHost('224.0.0.1')).toBe(true);
  expect(isBlockedHost('255.255.255.255')).toBe(true);
  expect(isBlockedHost('localhost')).toBe(true);
  expect(isBlockedHost('LOCALHOST')).toBe(true);
  expect(isBlockedHost('api.localhost')).toBe(true);
  expect(isBlockedHost('api.openai.com')).toBe(false);
});
