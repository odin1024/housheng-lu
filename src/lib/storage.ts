import type { MyListItem } from '@/types';

const STORAGE_KEY = 'housheng-lu:my-list:v1';

export function getMyList(): MyListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMyList(items: MyListItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addToMyList(entryId: string, status: MyListItem['status'] = 'todo') {
  const list = getMyList();
  if (list.some((i) => i.entryId === entryId)) return;
  list.push({
    entryId,
    status,
    addedAt: new Date().toISOString(),
  });
  saveMyList(list);
}

export function removeFromMyList(entryId: string) {
  const list = getMyList().filter((i) => i.entryId !== entryId);
  saveMyList(list);
}

export function updateMyListStatus(entryId: string, status: MyListItem['status']) {
  const list = getMyList().map((i) =>
    i.entryId === entryId ? { ...i, status, addedAt: i.addedAt } : i,
  );
  saveMyList(list);
}

export function isInMyList(entryId: string): boolean {
  return getMyList().some((i) => i.entryId === entryId);
}
