import { ipcMain, BrowserWindow } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { getSpawnPath } from "./binary-manager";
import { formatDuration, buildFormatString } from "../lib/format";

const activeDownloads = new Map<string, ChildProcess>();

export function registerDownloaderHandlers() {
  ipcMain.handle("download:start", async (event, options) => {
    const id = options.id;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { id };

    const ytdlpPath = await getSpawnPath("yt-dlp");
    const ffmpegPath = await getSpawnPath("ffmpeg");
    const ffmpegDir = path.dirname(ffmpegPath);

    // --print outputs metadata as first line before download starts
    // Use a unique separator since \t escape may not work via spawn
    const SEP = "<<|>>";
    const printTpl = `%(title)s${SEP}%(duration)s${SEP}%(thumbnail)s${SEP}%(filesize_approx)s${SEP}%(height)s`;

    const videoFormats = ["mp4", "mkv", "webm"];
    const isVideo = videoFormats.includes(options.format);

    const args = [
      "-f",
      buildFormatString(options.format, options.quality),
      "-o",
      `${options.savePath}/%(title)s.%(ext)s`,
      "--newline",
      "--progress",
      "--print",
      printTpl,
      "--no-simulate",
      "--ffmpeg-location",
      ffmpegDir,
    ];

    if (isVideo) {
      args.push("--merge-output-format", options.format);
    } else {
      args.push("-x", "--audio-format", options.format);
    }

    if (options.cookieBrowser) {
      args.push("--cookies-from-browser", options.cookieBrowser);
    }

    args.push(options.url);

    const proc = spawn(ytdlpPath, args);
    activeDownloads.set(id, proc);

    let metadataSent = false;
    let stderrBuffer = "";

    proc.stderr.on("data", (data: Buffer) => {
      stderrBuffer += data.toString();
    });

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();

      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Metadata line from --print has tab separators; progress lines don't
        if (!metadataSent && trimmed.includes(SEP)) {
          const parts = trimmed.split(SEP);
          if (parts.length >= 5) {
            metadataSent = true;
            const title = parts[0] || "Unknown";
            const duration = parseFloat(parts[1]) || 0;
            const thumbnail = parts[2] || "";
            const filesize = parseFloat(parts[3]) || 0;
            const height = parseInt(parts[4]) || 0;
            const resolution =
              height >= 2160 ? "4K" : height >= 1440 ? "1440p" : height > 0 ? `${height}p` : null;

            win.webContents.send("download:metadata", {
              id,
              title,
              duration: formatDuration(duration),
              thumbnail,
              filesize,
              resolution,
            });
          }
        }

        // Progress lines
        const match = trimmed.match(/(\d+\.?\d*)%/);
        if (match) {
          const progress = Math.round(parseFloat(match[1]));
          win.webContents.send("progress:update", {
            id,
            type: "download",
            progress,
            stage: "downloading",
          });
        }
      }
    });

    proc.on("close", (code) => {
      activeDownloads.delete(id);
      if (code === 0) {
        win.webContents.send("progress:update", {
          id,
          type: "download",
          progress: 100,
          stage: "completed",
        });
      } else {
        win.webContents.send("progress:update", {
          id,
          type: "download",
          progress: 0,
          stage: "error",
          errorMessage: stderrBuffer.trim() || `Processo encerrou com código ${code}`,
        });
      }
    });

    return { id };
  });

  ipcMain.handle("download:cancel", async (_event, id: string) => {
    const proc = activeDownloads.get(id);
    if (proc) {
      proc.kill();
      activeDownloads.delete(id);
    }
  });
}
