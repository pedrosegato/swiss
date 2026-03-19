const renderer = (window as any).ipcRenderer as {
  platform: string;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => void,
  ): void;
  off(channel: string, listener: (...args: unknown[]) => void): void;
  send(channel: string, ...args: unknown[]): void;
};

export const ipc = {
  platform: renderer.platform,

  minimizeWindow: () => renderer.invoke("window:minimize") as Promise<void>,
  maximizeWindow: () => renderer.invoke("window:maximize") as Promise<void>,
  closeWindow: () => renderer.invoke("window:close") as Promise<void>,

  checkBinaries: () =>
    renderer.invoke("binaries:check") as Promise<{
      ytdlp: { version: string | null; installed: boolean };
      ffmpeg: { version: string | null; installed: boolean };
      ffprobe: { version: string | null; installed: boolean };
    }>,

  installBinary: (name: "yt-dlp" | "ffmpeg" | "ffprobe") =>
    renderer.invoke("binaries:install", name) as Promise<{
      success: boolean;
      version: string | null;
      installed: boolean;
      path: string;
      source: "system" | "local" | "none";
    }>,

  updateBinary: (name: "yt-dlp" | "ffmpeg" | "ffprobe") =>
    renderer.invoke("binaries:update", name) as Promise<{
      success: boolean;
      version: string | null;
      installed: boolean;
      path: string;
      source: "system" | "local" | "none";
    }>,

  uninstallBinary: (name: "yt-dlp" | "ffmpeg" | "ffprobe") =>
    renderer.invoke("binaries:uninstall", name) as Promise<{
      success: boolean;
      version: string | null;
      installed: boolean;
      path: string;
      source: "system" | "local" | "none";
    }>,

  startDownload: (options: {
    id: string;
    url: string;
    format: string;
    quality: string;
    savePath: string;
    cookieBrowser?: string;
  }) =>
    renderer.invoke("download:start", options) as Promise<{
      id: string;
    }>,

  cancelDownload: (id: string) =>
    renderer.invoke("download:cancel", id) as Promise<void>,

  startConversion: (options: {
    id: string;
    inputPath: string;
    outputFormat: string;
    quality: string;
    savePath: string;
  }) =>
    renderer.invoke("convert:start", options) as Promise<{
      id: string;
    }>,

  cancelConversion: (id: string) =>
    renderer.invoke("convert:cancel", id) as Promise<void>,

  startMerge: (options: {
    id: string;
    mainPath: string;
    bgPath: string;
    direction: "vertical" | "horizontal";
    savePath: string;
  }) => renderer.invoke("merge:start", options) as Promise<{ id: string }>,

  cancelMerge: (id: string) =>
    renderer.invoke("merge:cancel", id) as Promise<void>,

  extractMergeThumbnail: (filePath: string) =>
    renderer.invoke("merge:thumbnail", filePath) as Promise<string | null>,

  extractThumbnail: (filePath: string) =>
    renderer.invoke("convert:thumbnail", filePath) as Promise<string | null>,

  selectFolder: () =>
    renderer.invoke("dialog:select-folder") as Promise<string | null>,

  selectFiles: (extensions: string[]) =>
    renderer.invoke("dialog:select-files", extensions) as Promise<
      { path: string; name: string; size: number; ext: string }[] | null
    >,

  openExternal: (url: string) =>
    renderer.invoke("shell:open-external", url) as Promise<void>,

  showItemInFolder: (filePath: string) =>
    renderer.invoke("shell:show-item-in-folder", filePath) as Promise<void>,

  openPath: (dirPath: string) =>
    renderer.invoke("shell:open-path", dirPath) as Promise<void>,

  checkPaths: (paths: { id: string; path: string }[]) =>
    renderer.invoke("fs:check-paths", paths) as Promise<string[]>,

  setDockProgress: (progress: number) =>
    renderer.invoke("dock:set-progress", progress) as Promise<void>,

  installUpdate: () => renderer.invoke("updater:install") as Promise<void>,

  onUpdaterStatus: (
    callback: (data: {
      status: "available" | "downloading" | "ready";
      version?: string;
      percent?: number;
    }) => void,
  ) => {
    const handler = (_event: unknown, ...args: unknown[]) => {
      callback(
        args[0] as {
          status: "available" | "downloading" | "ready";
          version?: string;
          percent?: number;
        },
      );
    };
    renderer.on("updater:status", handler);
    return () => renderer.off("updater:status", handler);
  },

  onMetadata: (
    callback: (data: {
      id: string;
      videoId: string;
      title: string;
      duration: string;
      thumbnail: string;
      filesize: number;
      resolution: string | null;
      playlistTitle?: string;
      playlistCount?: number;
    }) => void,
  ) => {
    const handler = (_event: unknown, ...args: unknown[]) => {
      callback(
        args[0] as {
          id: string;
          videoId: string;
          title: string;
          duration: string;
          thumbnail: string;
          filesize: number;
          resolution: string | null;
          playlistTitle?: string;
          playlistCount?: number;
        },
      );
    };
    renderer.on("download:metadata", handler);
    return () => renderer.off("download:metadata", handler);
  },

  onProgress: (
    callback: (data: {
      id: string;
      type: "download" | "convert" | "merge";
      progress: number;
      stage: string;
      errorMessage?: string;
      outputSize?: number;
      outputPath?: string;
      playlistDownloaded?: number;
      playlistFileSize?: number;
    }) => void,
  ) => {
    const handler = (_event: unknown, ...args: unknown[]) => {
      callback(
        args[0] as {
          id: string;
          type: "download" | "convert" | "merge";
          progress: number;
          stage: string;
          errorMessage?: string;
          outputSize?: number;
          outputPath?: string;
          playlistDownloaded?: number;
          playlistFileSize?: number;
        },
      );
    };
    renderer.on("progress:update", handler);
    return () => renderer.off("progress:update", handler);
  },
};
