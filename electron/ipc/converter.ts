import { ipcMain, BrowserWindow, app, Notification } from "electron";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { dirname, basename, extname, join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { readFile, stat, unlink } from "node:fs/promises";
import { getSpawnPath } from "./binary-manager";

const exec = promisify(execFile);
const activeConversions = new Map<string, ChildProcess>();

function safeSend(win: BrowserWindow, channel: string, data: unknown) {
  if (!win.isDestroyed()) win.webContents.send(channel, data);
}

export function killAllConversions() {
  for (const proc of activeConversions.values()) {
    proc.kill("SIGTERM");
  }
  activeConversions.clear();
}

export function registerConverterHandlers() {
  ipcMain.handle("convert:start", async (event, options) => {
    const id = options.id;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { id };

    const ffmpegPath = await getSpawnPath("ffmpeg");
    const durationSeconds = await getMediaDuration(options.inputPath);
    const outputPath = buildOutputPath(options);

    const args = [
      "-i",
      options.inputPath,
      "-y",
      ...getQualityArgs(options.outputFormat, options.quality),
      "-progress",
      "pipe:1",
      outputPath,
    ];

    const proc = spawn(ffmpegPath, args, {
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    });
    activeConversions.set(id, proc);

    let stderrBuffer = "";
    proc.stderr.on("data", (data: Buffer) => {
      stderrBuffer += data.toString();
      if (stderrBuffer.length > 65536)
        stderrBuffer = stderrBuffer.slice(-65536);
    });

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      const timeMatch = text.match(/out_time_us=(\d+)/);
      if (timeMatch && durationSeconds > 0) {
        const currentSeconds = parseInt(timeMatch[1]) / 1_000_000;
        const progress = Math.min(
          Math.round((currentSeconds / durationSeconds) * 100),
          99,
        );
        safeSend(win, "progress:update", {
          id,
          type: "convert",
          progress,
          stage: "converting",
        });
      }
    });

    proc.on("close", async (code) => {
      activeConversions.delete(id);
      if (code === 0) {
        let outputSize: number | undefined;
        try {
          const s = await stat(outputPath);
          outputSize = s.size;
        } catch {}

        const outputName = basename(outputPath);
        new Notification({
          title: "Conversão concluída",
          body: outputName,
        }).show();

        safeSend(win, "progress:update", {
          id,
          type: "convert",
          progress: 100,
          stage: "completed",
          outputSize,
          outputPath,
        });
      } else {
        const errMsg =
          stderrBuffer.trim() || `ffmpeg encerrou com código ${code}`;
        const isDiskFull = /no space left|disk full|não há espaço/i.test(
          errMsg,
        );

        safeSend(win, "progress:update", {
          id,
          type: "convert",
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

  ipcMain.handle("convert:cancel", async (_event, id: string) => {
    const proc = activeConversions.get(id);
    if (proc) {
      proc.kill();
      activeConversions.delete(id);
    }
  });

  ipcMain.handle(
    "convert:thumbnail",
    async (_event, filePath: string): Promise<string | null> => {
      const ffmpegPath = await getSpawnPath("ffmpeg");
      const tmpPath = join(
        app.getPath("temp"),
        `swiss-thumb-${Date.now()}.jpg`,
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
    },
  );
}

async function getMediaDuration(filePath: string): Promise<number> {
  const ffprobePath = await getSpawnPath("ffprobe");
  try {
    const { stdout } = await exec(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      filePath,
    ]);
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

function getQualityArgs(format: string, quality: string): string[] {
  const videoFormats = ["mp4", "mkv", "avi", "webm", "mov"];
  if (videoFormats.includes(format)) {
    if (quality === "Original") return [];
    const height = quality.replace("p", "");
    return ["-vf", `scale=-2:${height}`];
  }
  const bitrateMatch = quality.match(/(\d+)/);
  const bitrate = bitrateMatch ? bitrateMatch[1] : "192";
  return ["-b:a", `${bitrate}k`, "-vn"];
}

function buildOutputPath(options: {
  inputPath: string;
  outputFormat: string;
  savePath: string;
}): string {
  const dir =
    options.savePath === "same"
      ? dirname(options.inputPath)
      : options.savePath.replace("~", homedir());
  const name = basename(options.inputPath, extname(options.inputPath));
  let outputPath = join(dir, `${name}.${options.outputFormat}`);

  let counter = 1;
  while (existsSync(outputPath)) {
    outputPath = join(dir, `${name}_${counter}.${options.outputFormat}`);
    counter++;
  }

  return outputPath;
}
