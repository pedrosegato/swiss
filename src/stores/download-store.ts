import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDebouncedStorage } from "@/lib/debounced-storage";
import { ipc } from "@/lib/ipc";
import { createItemsSlice } from "@/stores/create-items-slice";
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
      ...createItemsSlice<DownloadItem>(set),
      sortBy: "recent",
      selectedFormat: "mp4",
      selectedQuality: "Máxima",

      clearItems: () => {
        const { items } = useDownloadStore.getState();
        for (const i of items) {
          if (i.stage !== "completed" && i.stage !== "error") {
            ipc.cancelDownload(i.id);
          }
        }
        set({ items: [] });
      },
      setSortBy: (sort) => set({ sortBy: sort }),
      setSelectedFormat: (fmt) => set({ selectedFormat: fmt }),
      setSelectedQuality: (q) => set({ selectedQuality: q }),
    }),
    {
      name: "swiss-downloads",
      version: 1,
      storage: createJSONStorage(() => createDebouncedStorage(750)),
      partialize: (state) => {
        const MAX_PERSISTED = 200;
        const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
        const now = Date.now();

        const items = state.items
          .filter(
            (i) =>
              i.stage !== "completed" || now - (i.createdAt ?? 0) < THIRTY_DAYS,
          )
          .slice(-MAX_PERSISTED);

        return {
          items,
          sortBy: state.sortBy,
          selectedFormat: state.selectedFormat,
          selectedQuality: state.selectedQuality,
        };
      },
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
