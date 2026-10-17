import type { MyListItem } from '@/types';

const STORAGE_KEY = 'housheng-lu:my-list:v2';
const CHANNEL_NAME = 'housheng-lu:mylist';

function isValidItem(x: any): x is MyListItem {
  return (
    x &&
    typeof x.entryId === 'string' &&
    (x.status === 'todo' || x.status === 'done' || x.status === 'saved') &&
    typeof x.addedAt === 'string'
  );
}

function readRaw(): MyListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.filter(isValidItem);
  } catch {
    return [];
  }
}

function writeRaw(items: MyListItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[storage] save failed', e);
  }
}

/**
 * 通知其他 tab / 其他 client component
 * 同一 tab 内的 storage 事件不触发, 所以用 BroadcastChannel
 * 跨 tab 的 storage 事件作为兜底
 */
function broadcast() {
  if (typeof window === 'undefined') return;
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage('update');
    ch.close();
  } catch {}
  // 主动触发 storage 事件 (同 tab 不会自动触发)
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch {}
}

export function getMyList(): MyListItem[] {
  return readRaw();
}

export function addToMyList(entryId: string, status: MyListItem['status'] = 'todo') {
  const list = readRaw();
  if (list.some((i) => i.entryId === entryId)) return;
  list.push({ entryId, status, addedAt: new Date().toISOString() });
  writeRaw(list);
  broadcast();
}

export function removeFromMyList(entryId: string) {
  const list = readRaw().filter((i) => i.entryId !== entryId);
  writeRaw(list);
  broadcast();
}

export function updateMyListStatus(entryId: string, status: MyListItem['status']) {
  const list = readRaw();
  const idx = list.findIndex((i) => i.entryId === entryId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], status };
  } else {
    // 显式补加, 避免幽灵
    list.push({ entryId, status, addedAt: new Date().toISOString() });
  }
  writeRaw(list);
  broadcast();
}

export function isInMyList(entryId: string): boolean {
  return readRaw().some((i) => i.entryId === entryId);
}

export function clearMyList() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  broadcast();
}

/**
 * 订阅本地清单变化 (跨 tab + 跨 component)
 * 返回 unsubscribe
 */
export function subscribeMyList(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };

  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = () => cb();
  } catch {}

  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('storage', onStorage);
    if (ch) ch.close();
  };
}
