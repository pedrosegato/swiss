import type { StateStorage } from "zustand/middleware";

export function createDebouncedStorage(delayMs: number): StateStorage {
  let pending: { key: string; value: string } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending) {
      localStorage.setItem(pending.key, pending.value);
      pending = null;
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  return {
    getItem: (key) => localStorage.getItem(key),
    removeItem: (key) => {
      if (pending?.key === key) pending = null;
      localStorage.removeItem(key);
    },
    setItem: (key, value) => {
      pending = { key, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
  };
}
