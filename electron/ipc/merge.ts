import { ipcMain, BrowserWindow, Notification } from "electron";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { basename, extname, join } from "node:path";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { getSpawnPath } from "./binary-manager";
import PQueue from "p-queue";

const exec = promisify(execFile);
const activeMerges = new Map<string, ChildProcess>();
const mergeQueue = new PQueue({ concurrency: 1 });

function safeSend(win: BrowserWindow, channel: string, data: unknown) {
  if (!win.isDestroyed()) win.webContents.send(channel, data);
}

export function killAllMerges() {
  mergeQueue.clear();
  for (const proc of activeMerges.values()) {
    proc.kill("SIGTERM");
  }
  activeMerges.clear();
}

interface VideoDimensions {
  width: number;
  height: number;
  duration: number;
}

async function probeVideo(filePath: string): Promise<VideoDimensions> {
  const ffprobePath = await getSpawnPath("ffprobe");
  const { stdout } = await exec(
    ffprobePath,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      filePath,
    ],
    { timeout: 10_000 },
  );
  const data = JSON.parse(stdout);
  const stream = data.streams?.[0] ?? {};
  const format = data.format ?? {};
  return {
    width: stream.width ?? 0,
    height: stream.height ?? 0,
    duration: parseFloat(format.duration) || 0,
  };
}

function buildFilterComplex(
  _main: VideoDimensions,
  _bg: VideoDimensions,
  direction: "vertical" | "horizontal",
): string {
  if (direction === "vertical") {
    return [
      `[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[v0]`,
      `[1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[v1]`,
      `[v0][v1]vstack=inputs=2[vout]`,
    ].join(";");
  } else {
    return [
      `[0:v]scale=540:1080:force_original_aspect_ratio=increase,crop=540:1080,setsar=1[v0]`,
      `[1:v]scale=540:1080:force_original_aspect_ratio=increase,crop=540:1080,setsar=1[v1]`,
      `[v0][v1]hstack=inputs=2[vout]`,
    ].join(";");
  }
}

function buildOutputPath(mainPath: string, savePath: string): string {
  const name = basename(mainPath, extname(mainPath));
  let outputPath = join(savePath, `${name}_merged.mp4`);
  let counter = 1;
  while (existsSync(outputPath)) {
    outputPath = join(savePath, `${name}_merged_${counter}.mp4`);
    counter++;
  }
  return outputPath;
}

function getEncoderArgs(): string[] {
  if (process.platform === "darwin") {
    return ["-c:v", "h264_videotoolbox", "-q:v", "65"];
  }
  return ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "18"];
}

export async function extractMergeThumbnail(
  filePath: string,
): Promise<string | null> {
  const ffmpegPath = await getSpawnPath("ffmpeg");
  const { app } = await import("electron");
  const { readFile } = await import("node:fs/promises");
  const { unlink } = await import("node:fs/promises");
  const tmpPath = join(
    app.getPath("temp"),
    `swiss-merge-thumb-${Date.now()}.jpg`,
  );
  try {
    await exec(ffmpegPath, [
      "-i",
      filePath,
      "-ss",
      "00:00:01",
      "-vframes",
      "1",
      "-vf",
      "scale=384:-2",
      "-q:v",
      "2",
      "-y",
      tmpPath,
    ]);
    const buf = await readFile(tmpPath);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    unlink(tmpPath).catch(() => {});
  }
}

function runMerge(
  ffmpegPath: string,
  args: string[],
  id: string,
  duration: number,
  win: BrowserWindow,
): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, args, {
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    });
    activeMerges.set(id, proc);

    let stderrBuffer = "";
    proc.stderr.on("data", (data: Buffer) => {
      const text = data.toString();
      stderrBuffer += text;
      if (stderrBuffer.length > 65536)
        stderrBuffer = stderrBuffer.slice(-65536);
    });

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      const timeMatch = text.match(/out_time_us=(\d+)/);
      if (timeMatch && duration > 0) {
        const currentSeconds = parseInt(timeMatch[1]) / 1_000_000;
        const progress = Math.min(
          Math.round((currentSeconds / duration) * 100),
          99,
        );
        safeSend(win, "progress:update", {
          id,
          type: "merge",
          progress,
          stage: "merging",
        });
      }
    });

    proc.on("close", (code) => {
      activeMerges.delete(id);
      resolve({ code, stderr: stderrBuffer });
    });

    proc.on("error", (err) => {
      activeMerges.delete(id);
      resolve({ code: -1, stderr: err.message });
    });
  });
}

export function registerMergeHandlers() {
  ipcMain.handle("merge:start", async (event, options) => {
    const { id, mainPath, bgPath, direction, savePath } = options;
    const maybeWin = BrowserWindow.fromWebContents(event.sender);
    if (!maybeWin) return { id };
    const win = maybeWin;

    mergeQueue.add(async () => {
      if (win.isDestroyed()) return;

      let mainInfo: VideoDimensions;
      let bgInfo: VideoDimensions;

      try {
        const ffmpegPath = await getSpawnPath("ffmpeg");
        [mainInfo, bgInfo] = await Promise.all([
          probeVideo(mainPath),
          probeVideo(bgPath),
        ]);

        if (mainInfo.width === 0 || bgInfo.width === 0) {
          safeSend(win, "progress:update", {
            id,
            type: "merge",
            progress: 0,
            stage: "error",
            errorMessage: "Não foi possível obter dimensões do vídeo",
          });
          return;
        }

        const filterComplex = buildFilterComplex(mainInfo, bgInfo, direction);
        const outputPath = buildOutputPath(mainPath, savePath);

        const buildArgs = (encoderArgs: string[]) => [
          "-i",
          mainPath,
          "-stream_loop",
          "-1",
          "-i",
          bgPath,
          "-filter_complex",
          filterComplex,
          "-map",
          "[vout]",
          "-map",
          "0:a?",
          ...encoderArgs,
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-t",
          String(mainInfo.duration),
          "-progress",
          "pipe:1",
          "-y",
          outputPath,
        ];

        const encoderArgs = getEncoderArgs();
        let args = buildArgs(encoderArgs);

        console.log("[merge] ffmpeg args:", args.join(" "));

        let result = await runMerge(
          ffmpegPath,
          args,
          id,
          mainInfo.duration,
          win,
        );

        if (result.code !== 0 && encoderArgs[1] !== "libx264") {
          console.log("[merge] HW encoder failed, retrying with libx264...");
          const swArgs = [
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "18",
          ];
          args = buildArgs(swArgs);
          result = await runMerge(ffmpegPath, args, id, mainInfo.duration, win);
        }

        if (result.code === 0) {
          let outputSize: number | undefined;
          try {
            const s = await stat(outputPath);
            outputSize = s.size;
          } catch {}

          new Notification({
            title: "Mesclagem concluída",
            body: basename(outputPath),
          }).show();

          safeSend(win, "progress:update", {
            id,
            type: "merge",
            progress: 100,
            stage: "completed",
            outputSize,
            outputPath,
          });
        } else {
          const lastLines = result.stderr
            .trim()
            .split("\n")
            .slice(-5)
            .join("\n");
          const errMsg =
            lastLines || `ffmpeg encerrou com código ${result.code}`;
          const isDiskFull = /no space left|disk full|não há espaço/i.test(
            errMsg,
          );

          safeSend(win, "progress:update", {
            id,
            type: "merge",
            progress: 0,
            stage: "error",
            errorMessage: isDiskFull
              ? "Disco cheio — libere espaço e tente novamente"
              : errMsg,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[merge] Error:", msg);
        safeSend(win, "progress:update", {
          id,
          type: "merge",
          progress: 0,
          stage: "error",
          errorMessage: `Erro na mesclagem: ${msg}`,
        });
      }
    });

    return { id };
  });

  ipcMain.handle("merge:cancel", async (_event, id: string) => {
    const proc = activeMerges.get(id);
    if (proc) {
      proc.kill();
      activeMerges.delete(id);
    }
  });

  ipcMain.handle("merge:thumbnail", async (_event, filePath: string) => {
    return extractMergeThumbnail(filePath);
  });
}
