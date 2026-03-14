import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import { autoUpdater } from "electron-updater";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerBinariesHandlers } from "./ipc/binaries";
import { registerDownloaderHandlers, killAllDownloads } from "./ipc/downloader";
import { registerConverterHandlers, killAllConversions } from "./ipc/converter";
import { registerDialogHandlers } from "./ipc/dialogs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isMac = process.platform === "darwin";

app.commandLine.appendSwitch("enable-features", "CanvasOopRasterization");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("disable-lcd-text", "0");
app.commandLine.appendSwitch("force-color-profile", "srgb");

app.setName("swiss");

if (process.platform === "win32") {
  const localBin = path.join(
    process.env.LOCALAPPDATA ??
      path.join(process.env.USERPROFILE ?? "", "AppData", "Local"),
    "Programs",
  );
  process.env.PATH = `${localBin};${process.env.PATH}`;
} else {
  const extraPaths = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    `${process.env.HOME}/.local/bin`,
  ];
  process.env.PATH = `${process.env.PATH}:${extraPaths.join(":")}`;
}

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 640,
    minHeight: 480,
    ...(isMac
      ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 12, y: 16 } }
      : { frame: false }),
    backgroundColor: "#121416",
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  win.on("closed", () => {
    win = null;
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

registerBinariesHandlers();
registerDownloaderHandlers();
registerConverterHandlers();
registerDialogHandlers();

ipcMain.handle("updater:install", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle("dock:set-progress", (_event, progress: number) => {
  if (win && !win.isDestroyed()) {
    win.setProgressBar(Math.max(-1, Math.min(1, progress)));
  }
});

ipcMain.handle("window:minimize", () => win?.minimize());
ipcMain.handle("window:maximize", () => {
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.handle("window:close", () => win?.close());

// Kill all child processes before quitting
app.on("before-quit", () => {
  killAllDownloads();
  killAllConversions();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    const iconPath = path.join(process.env.APP_ROOT, "build", "icon.png");
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

  createWindow();

  if (!VITE_DEV_SERVER_URL) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("error", (err) => {
      console.error("Auto-updater error:", err);
    });

    autoUpdater.on("update-available", (info) => {
      win?.webContents.send("updater:status", {
        status: "available",
        version: info.version,
      });
    });

    autoUpdater.on("download-progress", (progress) => {
      win?.webContents.send("updater:status", {
        status: "downloading",
        percent: Math.round(progress.percent),
      });
    });

    autoUpdater.on("update-downloaded", (info) => {
      win?.webContents.send("updater:status", {
        status: "ready",
        version: info.version,
      });
    });

    autoUpdater.checkForUpdates();

    setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
  }
});
