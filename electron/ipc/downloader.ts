import { ipcMain, BrowserWindow } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import {
  getSpawnPath,
  getYtdlpSpawnInfo,
} from "./binary-manager";

import { formatDuration, buildFormatString } from "../lib/format";
import { existsSync } from "node:fs";

const activeDownloads = new Map<string, ChildProcess>();

function safeSend(win: BrowserWindow, channel: string, data: unknown) {
  if (!win.isDestroyed()) win.webContents.send(channel, data);
}

export function killAllDownloads() {
  for (const proc of activeDownloads.values()) {
    proc.kill("SIGTERM");
  }
  activeDownloads.clear();
}

export function registerDownloaderHandlers() {
  ipcMain.handle("download:start", async (event, options) => {
    const id = options.id;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { id };

    const ytdlpInfo = await getYtdlpSpawnInfo();
    const ffmpegPath = await getSpawnPath("ffmpeg");
    const ffmpegDir = path.dirname(ffmpegPath);

    const SEP = "<<|>>";
    const printTpl = `%(id)s${SEP}%(title)s${SEP}%(duration)s${SEP}%(thumbnail)s${SEP}%(filesize_approx)s${SEP}%(height)s${SEP}%(resolution)s${SEP}%(playlist_title)s${SEP}%(n_entries)s${SEP}%(playlist_index)s`;

    const videoFormats = ["mp4", "mkv", "webm"];
    const isVideo = videoFormats.includes(options.format);
    const isPlaylist = /[?&]list=|\/playlist\?|\/sets\//.test(options.url);

    const outputTemplate = isPlaylist
      ? `${options.savePath}/%(playlist_title)s/%(title)s_%(id)s.%(ext)s`
      : `${options.savePath}/%(title)s_%(id)s.%(ext)s`;

    const args = [
      "-f",
      buildFormatString(options.format, options.quality),
      "-o",
      outputTemplate,
      "--newline",
      "--progress",
      "--print",
      printTpl,
      "--no-simulate",
      "--ffmpeg-location",
      ffmpegDir,
    ];

    args.push("--remote-components", "ejs:github");

    if (isVideo) {
      args.push("--merge-output-format", options.format);
    } else {
      args.push("-x", "--audio-format", options.format);
    }

    if (isVideo && options.format === "mp4") {
      args.push(
        "--postprocessor-args",
        "ffmpeg:-c:v libx264 -preset ultrafast -crf 18 -c:a aac -b:a 192k",
      );
    }

    if (process.platform === "win32") {
      args.push("--encoding", "utf-8");
    }

    if (options.cookieBrowser) {
      args.push("--cookies-from-browser", options.cookieBrowser);
    }

    args.push(options.url);

    const proc = spawn(ytdlpInfo.command, [...ytdlpInfo.prefixArgs, ...args], {
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    });
    activeDownloads.set(id, proc);

    let metadataSent = false;
    let stderrBuffer = "";
    let lastTitle = "";
    let lastVideoId = "";
    let playlistTotal = 0;
    let playlistCurrentIndex = 0;

    proc.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      stderrBuffer += text;
      if (stderrBuffer.length > 65536)
        stderrBuffer = stderrBuffer.slice(-65536);

      if (
        /\[Merger\]|\[ExtractAudio\]|\[FFmpegVideoConvertor\]|\[FixupM3u8\]/.test(
          text,
        )
      ) {
        if (playlistTotal > 0) {
          const progress = Math.round(
            ((playlistCurrentIndex - 1 + 1) / playlistTotal) * 100,
          );
          safeSend(win, "progress:update", {
            id,
            type: "download",
            progress: Math.min(progress, 99),
            stage: "converting",
            playlistDownloaded: playlistCurrentIndex,
          });
        } else {
          safeSend(win, "progress:update", {
            id,
            type: "download",
            progress: 100,
            stage: "converting",
          });
        }
      }
    });

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();

      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.includes(SEP)) {
          const parts = trimmed.split(SEP);
          if (parts.length >= 6) {
            const videoId = parts[0] || "";
            const title = parts[1] || "Unknown";
            lastTitle = title;
            lastVideoId = videoId;
            const duration = parseFloat(parts[2]) || 0;
            const thumbnail = parts[3] || "";
            const filesize = parseFloat(parts[4]) || 0;
            const height = parseInt(parts[5]) || 0;
            const resStr = parts[6]?.trim() || "";

            let resolution: string | null = null;
            if (height >= 2160) resolution = "4K";
            else if (height >= 1440) resolution = "1440p";
            else if (height > 0) resolution = `${height}p`;
            else if (resStr && resStr !== "NA" && resStr !== "audio only") {
              const resParts = resStr.split("x");
              const resH = parseInt(resParts[1]) || 0;
              if (resH >= 2160) resolution = "4K";
              else if (resH >= 1440) resolution = "1440p";
              else if (resH > 0) resolution = `${resH}p`;
            }

            const playlistTitle = parts[7]?.trim() || "";
            const nEntries = parseInt(parts[8]) || 0;
            const plIndex = parseInt(parts[9]) || 0;

            if (nEntries > 0) {
              playlistTotal = nEntries;
              playlistCurrentIndex = plIndex;
            }

            if (!metadataSent) {
              metadataSent = true;
              safeSend(win, "download:metadata", {
                id,
                videoId,
                title,
                duration: formatDuration(duration),
                thumbnail,
                filesize,
                resolution,
                ...(playlistTitle && playlistTitle !== "NA"
                  ? { playlistTitle, playlistCount: nEntries }
                  : {}),
              });
            }
          }
        }

        const match = trimmed.match(/(\d+\.?\d*)%/);
        if (match) {
          const videoProgress = parseFloat(match[1]);

          let progress: number;
          if (playlistTotal > 0) {
            progress = Math.round(
              ((playlistCurrentIndex - 1 + videoProgress / 100) /
                playlistTotal) *
                100,
            );
          } else {
            progress = Math.round(videoProgress);
          }

          safeSend(win, "progress:update", {
            id,
            type: "download",
            progress,
            stage: "downloading",
            ...(playlistTotal > 0
              ? { playlistDownloaded: playlistCurrentIndex - 1 }
              : {}),
          });
        }
      }
    });

    proc.on("close", (code) => {
      activeDownloads.delete(id);
      if (code === 0) {
        let outputPath: string | undefined;

        if (playlistTotal > 0) {
          const plTitleMatch = stderrBuffer.match(
            /\[download\] Downloading playlist: (.+)/,
          );
          if (plTitleMatch) {
            outputPath = path.join(options.savePath, plTitleMatch[1].trim());
          }
        } else {
          const mergerMatch = stderrBuffer.match(
            /\[Merger\] Merging formats into "(.+?)"/,
          );
          if (mergerMatch) {
            outputPath = mergerMatch[1];
          } else {
            const destMatches = [
              ...stderrBuffer.matchAll(/\[download\] Destination: (.+)/g),
            ];
            if (destMatches.length > 0) {
              outputPath = destMatches[destMatches.length - 1][1].trim();
            }
          }

          if (!outputPath && metadataSent) {
            const ext = options.format;
            const guessedPath = `${options.savePath}/${lastTitle}_${lastVideoId}.${ext}`;
            if (existsSync(guessedPath)) {
              outputPath = guessedPath;
            }
          }
        }

        safeSend(win, "progress:update", {
          id,
          type: "download",
          progress: 100,
          stage: "completed",
          outputPath,
        });
      } else {
        const errMsg =
          stderrBuffer.trim() || `Processo encerrou com código ${code}`;
        const isDiskFull = /no space left|disk full|não há espaço/i.test(
          errMsg,
        );

        safeSend(win, "progress:update", {
          id,
          type: "download",
          progress: 0,
          stage: "error",
          errorMessage: isDiskFull
            ? "Disco cheio — libere espaço e tente novamente"
            : errMsg,
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
