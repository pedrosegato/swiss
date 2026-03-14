import { create } from "zustand";
import type { ConvertItem, ConvertFormat } from "@/lib/types";

interface ConvertState {
  items: ConvertItem[];
  outputFormat: ConvertFormat;
  quality: string;
  savePath: string;

  addItem: (item: ConvertItem) => void;
  addItems: (items: ConvertItem[]) => void;
  updateItem: (id: string, updates: Partial<ConvertItem>) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  setOutputFormat: (fmt: ConvertFormat) => void;
  setQuality: (q: string) => void;
  setSavePath: (path: string) => void;
}

export const useConvertStore = create<ConvertState>((set) => ({
  items: [],
  outputFormat: "mp4",
  quality: "1080p",
  savePath: "same",

  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  addItems: (items) => set((s) => ({ items: [...s.items, ...items] })),
  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clearItems: () => set({ items: [] }),
  setOutputFormat: (fmt) => set({ outputFormat: fmt }),
  setQuality: (q) => set({ quality: q }),
  setSavePath: (path) => set({ savePath: path }),
}));
