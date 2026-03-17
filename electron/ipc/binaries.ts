import { ipcMain, BrowserWindow } from "electron";
import {
  resolveBinary,
  downloadBinary,
  uninstallBinary,
  updateBinary,
  getSpawnPath,
} from "./binary-manager";

export function registerBinariesHandlers() {
  ipcMain.handle("binaries:check", async () => {
    const [ytdlp, ffmpeg, ffprobe] = await Promise.all([
      resolveBinary("yt-dlp"),
      resolveBinary("ffmpeg"),
      resolveBinary("ffprobe"),
    ]);
    return { ytdlp, ffmpeg, ffprobe };
  });

  ipcMain.handle(
    "binaries:install",
    async (event, name: "yt-dlp" | "ffmpeg" | "ffprobe") => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const success = await downloadBinary(name, (percent) => {
        win?.webContents.send("binaries:install-progress", { name, percent });
      });

      if (success) {
        if (process.platform === "win32") {
          await new Promise((r) => setTimeout(r, 1500));
        }
        const info = await resolveBinary(name);
        return { success: true, ...info };
      }
      return {
        success: false,
        installed: false,
        version: null,
        path: "",
        source: "none" as const,
      };
    },
  );

  ipcMain.handle(
    "binaries:uninstall",
    async (_event, name: "yt-dlp" | "ffmpeg" | "ffprobe") => {
      const success = await uninstallBinary(name);
      if (success) {
        const info = await resolveBinary(name);
        return { success: true, ...info };
      }
      return {
        success: false,
        installed: false,
        version: null,
        path: "",
        source: "none" as const,
      };
    },
  );

  ipcMain.handle(
    "binaries:update",
    async (_event, name: "yt-dlp" | "ffmpeg" | "ffprobe") => {
      const success = await updateBinary(name);
      if (success) {
        const info = await resolveBinary(name);
        return { success: true, ...info };
      }
      return {
        success: false,
        installed: false,
        version: null,
        path: "",
        source: "none" as const,
      };
    },
  );

  ipcMain.handle(
    "binaries:get-path",
    async (_event, name: "yt-dlp" | "ffmpeg" | "ffprobe") => {
      return getSpawnPath(name);
    },
  );
}
