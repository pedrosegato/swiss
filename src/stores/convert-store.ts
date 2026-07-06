import { create } from "zustand";
import type { ConvertItem, ConvertFormat } from "@/lib/types";
import { ipc } from "@/lib/ipc";
import { useSettingsStore } from "@/stores/settings-store";
import { createItemsSlice } from "@/stores/create-items-slice";

interface ConvertState {
  items: ConvertItem[];
  outputFormat: ConvertFormat;
  quality: string;

  addItem: (item: ConvertItem) => void;
  addItems: (items: ConvertItem[]) => void;
  updateItem: (id: string, updates: Partial<ConvertItem>) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  setOutputFormat: (fmt: ConvertFormat) => void;
  setQuality: (q: string) => void;
  startAll: () => void;
}

export const useConvertStore = create<ConvertState>((set) => ({
  ...createItemsSlice<ConvertItem>(set),
  outputFormat: "mp4",
  quality: "Original",

  clearItems: () => {
    const { items } = useConvertStore.getState();
    for (const i of items) {
      if (i.stage !== "completed" && i.stage !== "error") {
        ipc.cancelConversion(i.id);
      }
    }
    set({ items: [] });
  },
  setOutputFormat: (fmt) => set({ outputFormat: fmt }),
  setQuality: (q) => set({ quality: q }),
  startAll: () => {
    const { items } = useConvertStore.getState();
    const savePath = useSettingsStore.getState().downloadPath;
    if (!savePath) return;
    const toStart = items.filter((i) => i.stage === "queued");
    if (toStart.length === 0) return;

    set((s) => ({
      items: s.items.map((i) =>
        i.stage === "queued"
          ? { ...i, stage: "converting" as const, progress: 0 }
          : i,
      ),
    }));

    for (const item of toStart) {
      ipc.startConversion({
        id: item.id,
        inputPath: item.inputPath,
        outputFormat: item.outputFormat,
        quality: item.quality,
        savePath,
      });
    }
  },
}));
