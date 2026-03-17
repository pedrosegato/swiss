import { create } from "zustand";
import type { MergeItem, MergeDirection } from "@/lib/types";
import { ipc } from "@/lib/ipc";
import { useSettingsStore } from "@/stores/settings-store";

interface FileEntry {
  path: string;
  name: string;
  size: number;
}

interface MergeState {
  mainFiles: FileEntry[];
  bgFiles: FileEntry[];
  items: MergeItem[];
  direction: MergeDirection;

  addMainFiles: (files: FileEntry[]) => void;
  addBgFiles: (files: FileEntry[]) => void;
  removeMainFile: (path: string) => void;
  removeBgFile: (path: string) => void;
  clearMainFiles: () => void;
  clearBgFiles: () => void;
  setDirection: (d: MergeDirection) => void;
  updateItem: (id: string, updates: Partial<MergeItem>) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
  startAll: () => void;
}

export const useMergeStore = create<MergeState>((set) => ({
  mainFiles: [],
  bgFiles: [],
  items: [],
  direction: "vertical",

  addMainFiles: (files) =>
    set((s) => ({ mainFiles: [...s.mainFiles, ...files] })),
  addBgFiles: (files) => set((s) => ({ bgFiles: [...s.bgFiles, ...files] })),
  removeMainFile: (path) =>
    set((s) => ({ mainFiles: s.mainFiles.filter((f) => f.path !== path) })),
  removeBgFile: (path) =>
    set((s) => ({ bgFiles: s.bgFiles.filter((f) => f.path !== path) })),
  clearMainFiles: () => set({ mainFiles: [] }),
  clearBgFiles: () => set({ bgFiles: [] }),
  setDirection: (direction) => set({ direction }),
  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clearCompleted: () =>
    set((s) => ({
      items: s.items.filter((i) => i.stage !== "completed"),
    })),
  startAll: () => {
    const { mainFiles, bgFiles, direction } = useMergeStore.getState();
    const savePath = useSettingsStore.getState().downloadPath;
    if (mainFiles.length === 0 || bgFiles.length === 0 || !savePath) return;

    const newItems: MergeItem[] = mainFiles.map((main, i) => {
      const bg = bgFiles[i % bgFiles.length];
      return {
        id: crypto.randomUUID(),
        mainPath: main.path,
        mainName: main.name,
        bgPath: bg.path,
        bgName: bg.name,
        direction,
        stage: "merging" as const,
        progress: 0,
        savePath,
      };
    });

    set((s) => ({ items: [...s.items, ...newItems] }));

    for (const item of newItems) {
      ipc.startMerge({
        id: item.id,
        mainPath: item.mainPath,
        bgPath: item.bgPath,
        direction: item.direction,
        savePath: item.savePath,
      });
    }
  },
}));
