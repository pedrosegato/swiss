import { ipcMain, dialog, shell } from "electron";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export function registerDialogHandlers() {
  ipcMain.handle("dialog:select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(
    "dialog:select-files",
    async (_event, extensions: string[]) => {
      const result = await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Media", extensions }],
      });

      if (result.canceled) return null;

      const files = await Promise.all(
        result.filePaths.map(async (filePath) => {
          const stats = await stat(filePath);
          return {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            ext: path.extname(filePath).slice(1).toLowerCase(),
          };
        }),
      );

      return files;
    },
  );

  ipcMain.handle("shell:open-external", async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle(
    "shell:show-item-in-folder",
    async (_event, filePath: string) => {
      const resolved = filePath.replace(/^~/, homedir());
      shell.showItemInFolder(resolved);
    },
  );

  ipcMain.handle(
    "shell:open-path",
    async (_event, dirPath: string) => {
      const resolved = dirPath.replace(/^~/, homedir());
      await shell.openPath(resolved);
    },
  );
}
