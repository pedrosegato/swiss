import { ipcMain, BrowserWindow } from "electron";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { dirname, basename, extname, join } from "node:path";
import { homedir } from "node:os";
import { getSpawnPath } from "./binary-manager";

const exec = promisify(execFile);
const activeConversions = new Map<string, ChildProcess>();

export function registerConverterHandlers() {
  ipcMain.handle("convert:start", async (event, options) => {
    const id = crypto.randomUUID();
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

    const proc = spawn(ffmpegPath, args);
    activeConversions.set(id, proc);

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      const timeMatch = text.match(/out_time_us=(\d+)/);
      if (timeMatch && durationSeconds > 0) {
        const currentSeconds = parseInt(timeMatch[1]) / 1_000_000;
        const progress = Math.min(
          Math.round((currentSeconds / durationSeconds) * 100),
          99,
        );
        win.webContents.send("progress:update", {
          id,
          type: "convert",
          progress,
          stage: "converting",
        });
      }
    });

    proc.on("close", (code) => {
      activeConversions.delete(id);
      win.webContents.send("progress:update", {
        id,
        type: "convert",
        progress: 100,
        stage: code === 0 ? "completed" : "error",
      });
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
}

async function getMediaDuration(filePath: string): Promise<number> {
  const ffprobePath = await getSpawnPath("ffprobe");
  try {
    const { stdout } = await exec(ffprobePath, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
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
  return join(dir, `${name}.${options.outputFormat}`);
}
