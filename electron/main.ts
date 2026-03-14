import { app, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerBinariesHandlers } from "./ipc/binaries";
import { registerDownloaderHandlers } from "./ipc/downloader";
import { registerConverterHandlers } from "./ipc/converter";
import { registerDialogHandlers } from "./ipc/dialogs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.platform === "darwin" || process.platform === "linux") {
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
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 16 },
    backgroundColor: "#121416",
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Register all IPC handlers
registerBinariesHandlers();
registerDownloaderHandlers();
registerConverterHandlers();
registerDialogHandlers();

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();

  if (!VITE_DEV_SERVER_URL) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

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

import { ipcMain } from "electron";
ipcMain.handle("updater:install", () => {
  autoUpdater.quitAndInstall();
});
