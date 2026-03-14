import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DownloadItem, DownloadFormat, SortOption } from "@/lib/types";

interface DownloadState {
  items: DownloadItem[];
  sortBy: SortOption;
  selectedFormat: DownloadFormat;
  selectedQuality: string;

  addItem: (item: DownloadItem) => void;
  updateItem: (id: string, updates: Partial<DownloadItem>) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  setSortBy: (sort: SortOption) => void;
  setSelectedFormat: (fmt: DownloadFormat) => void;
  setSelectedQuality: (q: string) => void;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set) => ({
      items: [],
      sortBy: "recent",
      selectedFormat: "mp4",
      selectedQuality: "Máxima",

      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      updateItem: (id, updates) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearItems: () => set({ items: [] }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setSelectedFormat: (fmt) => set({ selectedFormat: fmt }),
      setSelectedQuality: (q) => set({ selectedQuality: q }),
    }),
    {
      name: "swiss-downloads",
      version: 1,
      partialize: (state) => ({
        items: state.items,
        sortBy: state.sortBy,
        selectedFormat: state.selectedFormat,
        selectedQuality: state.selectedQuality,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.items = state.items.map((item) =>
          item.stage === "downloading" ||
          item.stage === "fetching" ||
          item.stage === "converting"
            ? {
                ...item,
                stage: "error",
                errorMessage: "Interrompido ao fechar o app",
              }
            : item,
        );
      },
    },
  ),
);
