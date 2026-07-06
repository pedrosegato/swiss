import { invoke, Channel } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { type as osType } from "@tauri-apps/plugin-os";
import type { ProgressMessage, MetadataMessage } from "@/lib/types";

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

interface ConvertOptions {
  id: string;
  inputPath: string;
  outputFormat: string;
  quality: string;
  savePath: string;
}

interface MergeOptions {
  id: string;
  mainPath: string;
  bgPath: string;
  direction: "vertical" | "horizontal";
  savePath: string;
}

function makeCanceller(command: string) {
  return (id: string) => invoke<void>(command, { id });
}

function makeProgressStarter<TOptions>(command: string) {
  return (options: TOptions) => {
    const onEvent = new Channel<ProgressMessage>();
    onEvent.onmessage = (msg) =>
      window.dispatchEvent(new CustomEvent("progress:update", { detail: msg }));
    return invoke<void>(command, { options, onEvent });
  };
}

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
    const onEvent = new Channel<{ name: string; percent: number }>();
    onEvent.onmessage = (msg) => window.dispatchEvent(new CustomEvent("binaries:install-progress", { detail: msg }));
    return invoke<InstallResult>("binaries_install", { name, onEvent });
  },

  updateBinary: (name: "yt-dlp" | "ffmpeg" | "ffprobe") =>
    invoke<InstallResult>("binaries_update", { name }),

  uninstallBinary: (name: "yt-dlp" | "ffmpeg" | "ffprobe") =>
    invoke<InstallResult>("binaries_uninstall", { name }),

  startDownload: (options: {
    id: string; url: string; format: string; quality: string; savePath: string; cookieBrowser?: string;
  }) => {
    const onEvent = new Channel<
      | { event: "metadata"; data: MetadataMessage }
      | { event: "progress"; data: ProgressMessage }
    >();
    onEvent.onmessage = (msg) => {
      if (msg.event === "metadata") {
        window.dispatchEvent(new CustomEvent("download:metadata", { detail: msg.data }));
      } else if (msg.event === "progress") {
        window.dispatchEvent(new CustomEvent("progress:update", { detail: msg.data }));
      }
    };
    return invoke<void>("download_start", { options, onEvent });
  },

  cancelDownload: makeCanceller("download_cancel"),

  startConversion: makeProgressStarter<ConvertOptions>("convert_start"),

  cancelConversion: makeCanceller("convert_cancel"),

  startMerge: makeProgressStarter<MergeOptions>("merge_start"),

  cancelMerge: makeCanceller("merge_cancel"),

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
    const promise = listen<{ status: string; version?: string; percent?: number; message?: string }>(
      "updater:status",
      (event) => {
        const p = event.payload;
        if (p.status === "available" || p.status === "downloading" || p.status === "ready") {
          callback({ status: p.status, version: p.version, percent: p.percent });
        }
      },
    );
    return () => { promise.then((u) => u()); };
  },

  onMetadata: (callback: (data: MetadataMessage) => void): (() => void) => {
    const handler = (e: Event) => callback((e as CustomEvent).detail);
    window.addEventListener("download:metadata", handler);
    return () => window.removeEventListener("download:metadata", handler);
  },

  onProgress: (callback: (data: ProgressMessage) => void): (() => void) => {
    const handler = (e: Event) => callback((e as CustomEvent).detail);
    window.addEventListener("progress:update", handler);
    return () => window.removeEventListener("progress:update", handler);
  },
};
