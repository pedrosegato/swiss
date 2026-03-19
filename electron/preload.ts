import { ipcRenderer, contextBridge } from "electron";

const ALLOWED_INVOKE = new Set([
  "binaries:check",
  "binaries:install",
  "binaries:uninstall",
  "binaries:update",
  "binaries:get-path",
  "download:start",
  "download:cancel",
  "convert:start",
  "convert:cancel",
  "merge:start",
  "merge:cancel",
  "merge:thumbnail",
  "convert:thumbnail",
  "dialog:select-folder",
  "dialog:select-files",
  "shell:open-external",
  "shell:show-item-in-folder",
  "shell:open-path",
  "dock:set-progress",
  "updater:install",
  "fs:check-paths",
  "app:get-downloads-path",
  "window:minimize",
  "window:maximize",
  "window:close",
]);

const ALLOWED_LISTEN = new Set([
  "download:metadata",
  "progress:update",
  "updater:status",
  "binaries:install-progress",
]);

contextBridge.exposeInMainWorld("ipcRenderer", {
  platform: process.platform,
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void) {
    if (!ALLOWED_LISTEN.has(channel)) return;
    ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(channel: string, listener: (...args: unknown[]) => void) {
    if (!ALLOWED_LISTEN.has(channel)) return;
    ipcRenderer.off(channel, listener);
  },
  send(channel: string, ...args: unknown[]) {
    if (!ALLOWED_INVOKE.has(channel)) return;
    ipcRenderer.send(channel, ...args);
  },
  invoke(channel: string, ...args: unknown[]) {
    if (!ALLOWED_INVOKE.has(channel))
      throw new Error(`Blocked IPC channel: ${channel}`);
    return ipcRenderer.invoke(channel, ...args);
  },
});
