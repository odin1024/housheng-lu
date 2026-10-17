'use client';

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

interface Toast {
  id: number;
  msg: string;
}

interface ToastStore {
  items: Toast[];
  show: (msg: string) => void;
  dismiss: (id: number) => void;
}

let counter = 0;
const store = createStore<ToastStore>((set) => ({
  items: [],
  show: (msg) => {
    const id = ++counter;
    set((s) => ({ items: [...s.items, { id, msg }] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 2400);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const create = {
  useStore: () => useStore(store),
  show: (msg: string) => store.getState().show(msg),
};
