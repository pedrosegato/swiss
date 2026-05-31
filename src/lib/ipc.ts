import { invoke, Channel } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { type as osType } from "@tauri-apps/plugin-os";

let cachedPlatform = "linux";

export async function initIpc() {
  const t = await osType();
  cachedPlatform = t === "macos" ? "darwin" : t === "windows" ? "win32" : "linux";
}

type InstallResult = {
  success: boolean;
  installed: boolean;
  version: string | null;
  path: string;
  source: "system" | "local" | "none";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ipc = {
  get platform() { return cachedPlatform; },

  minimizeWindow: () => invoke<void>("window_minimize"),
  maximizeWindow: () => invoke<void>("window_maximize"),
  closeWindow: () => invoke<void>("window_close"),

  checkBinaries: () =>
    invoke<{
      ytdlp: { version: string | null; installed: boolean };
      ffmpeg: { version: string | null; installed: boolean };
      ffprobe: { version: string | null; installed: boolean };
    }>("binaries_check"),

  installBinary: (name: "yt-dlp" | "ffmpeg" | "ffprobe") => {
    return new Promise<InstallResult>((resolve, reject) => {
      const onEvent = new Channel<{ name: string; percent: number }>();
      onEvent.onmessage = (msg) => {
        window.dispatchEvent(new CustomEvent("binaries:install-progress", { detail: msg }));
      };
      invoke<InstallResult>("binaries_install", { name, onEvent }).then(resolve, reject);
    });
  },

  updateBinary: (name: "yt-dlp" | "ffmpeg" | "ffprobe") =>
    invoke<InstallResult>("binaries_update", { name }),

  uninstallBinary: (name: "yt-dlp" | "ffmpeg" | "ffprobe") =>
    invoke<InstallResult>("binaries_uninstall", { name }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startDownload: (options: {
    id: string; url: string; format: string; quality: string; savePath: string; cookieBrowser?: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onEvent = new Channel<any>();
    onEvent.onmessage = (msg) => {
      if (msg.event === "metadata") {
        window.dispatchEvent(new CustomEvent("download:metadata", { detail: msg.data }));
      } else if (msg.event === "progress") {
        window.dispatchEvent(new CustomEvent("progress:update", { detail: msg.data }));
      }
    };
    return invoke<{ id: string }>("download_start", { options, onEvent });
  },

  cancelDownload: (id: string) => invoke<void>("download_cancel", { id }),

  startConversion: (options: {
    id: string; inputPath: string; outputFormat: string; quality: string; savePath: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onEvent = new Channel<any>();
    onEvent.onmessage = (msg) =>
      window.dispatchEvent(new CustomEvent("progress:update", { detail: msg }));
    return invoke<{ id: string }>("convert_start", { options, onEvent });
  },

  cancelConversion: (id: string) => invoke<void>("convert_cancel", { id }),

  startMerge: (options: {
    id: string; mainPath: string; bgPath: string; direction: "vertical" | "horizontal"; savePath: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onEvent = new Channel<any>();
    onEvent.onmessage = (msg) =>
      window.dispatchEvent(new CustomEvent("progress:update", { detail: msg }));
    return invoke<{ id: string }>("merge_start", { options, onEvent });
  },

  cancelMerge: (id: string) => invoke<void>("merge_cancel", { id }),

  extractMergeThumbnail: (filePath: string) =>
    invoke<string | null>("merge_thumbnail", { filePath }),

  extractThumbnail: (filePath: string) =>
    invoke<string | null>("convert_thumbnail", { filePath }),

  selectFolder: () => invoke<string | null>("dialog_select_folder"),

  selectFiles: (extensions: string[]) =>
    invoke<{ path: string; name: string; size: number; ext: string }[] | null>(
      "dialog_select_files",
      { extensions },
    ),

  openExternal: (url: string) => invoke<void>("shell_open_external", { url }),

  showItemInFolder: (filePath: string) =>
    invoke<void>("shell_show_item_in_folder", { filePath }),

  openPath: (dirPath: string) => invoke<void>("shell_open_path", { dirPath }),

  checkPaths: (paths: { id: string; path: string }[]) =>
    invoke<string[]>("fs_check_paths", { paths }),

  setDockProgress: (progress: number) =>
    invoke<void>("dock_set_progress", { progress }),

  installUpdate: () => invoke<void>("updater_install"),

  onUpdaterStatus: (
    callback: (data: {
      status: "available" | "downloading" | "ready";
      version?: string;
      percent?: number;
    }) => void,
  ): (() => void) => {
    let unlisten: UnlistenFn | null = null;
    listen<{ status: string; version?: string; percent?: number; message?: string }>(
      "updater:status",
      (event) => {
        const p = event.payload;
        if (p.status === "available" || p.status === "downloading" || p.status === "ready") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback({ status: p.status as any, version: p.version, percent: p.percent });
        }
      }
    ).then((u) => { unlisten = u; });
    return () => { if (unlisten) unlisten(); };
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMetadata: (callback: (data: any) => void): (() => void) => {
    const handler = (e: Event) => callback((e as CustomEvent).detail);
    window.addEventListener("download:metadata", handler);
    return () => window.removeEventListener("download:metadata", handler);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onProgress: (callback: (data: any) => void): (() => void) => {
    const handler = (e: Event) => callback((e as CustomEvent).detail);
    window.addEventListener("progress:update", handler);
    return () => window.removeEventListener("progress:update", handler);
  },
};
