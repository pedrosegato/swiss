import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Browser } from "@/lib/types";

interface SettingsState {
  downloadPath: string;
  useCookies: boolean;
  cookieBrowser: Browser;

  setDownloadPath: (path: string) => void;
  setUseCookies: (enabled: boolean) => void;
  setCookieBrowser: (browser: Browser) => void;
  initDownloadPath: (path: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      downloadPath: "",
      useCookies: false,
      cookieBrowser: "chrome",

      setDownloadPath: (path) => set({ downloadPath: path }),
      setUseCookies: (enabled) => set({ useCookies: enabled }),
      setCookieBrowser: (browser) => set({ cookieBrowser: browser }),
      initDownloadPath: (path) => {
        if (!get().downloadPath) {
          set({ downloadPath: path });
        }
      },
    }),
    {
      name: "swiss-settings",
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2 && persisted.downloadPath === "~/Downloads") {
          persisted.downloadPath = "";
        }
        return persisted;
      },
    },
  ),
);
