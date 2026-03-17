import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createWriteStream, chmodSync, existsSync } from "node:fs";
import { mkdir, unlink, symlink } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import {
  getLocalBinDir,
  getLocalBinPath,
  getPlatformVariant,
  findPython,
  getPipUserBinDir,
} from "./platform";
import {
  clearPathCache,
  getSpawnPath,
  getDenoPath,
  type BinaryName,
} from "./binary-resolver";

const exec = promisify(execFile);

const YTDLP_URLS: Record<string, string> = {
  "darwin-arm64":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
  "darwin-x64":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
  "win32-x64":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
  "linux-x64":
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux",
};

const FFMPEG_URLS: Record<string, string> = {
  "darwin-arm64":
    "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffmpeg-osx-arm64",
  "darwin-x64":
    "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffmpeg-osx-x64",
  "win32-x64":
    "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffmpeg-win-x64.exe",
  "linux-x64":
    "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffmpeg-linux-x64",
};

const FFPROBE_URLS: Record<string, string> = {
  "darwin-arm64":
    "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffprobe-osx-arm64",
  "darwin-x64":
    "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffprobe-osx-x64",
  "win32-x64":
    "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffprobe-win-x64.exe",
  "linux-x64":
    "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffprobe-linux-x64",
};

const DENO_URLS: Record<string, string> = {
  "darwin-arm64":
    "https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip",
  "darwin-x64":
    "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-apple-darwin.zip",
  "win32-x64":
    "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip",
  "linux-x64":
    "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip",
};

function getDownloadUrl(name: BinaryName): string {
  if (name === "yt-dlp") return getPlatformVariant(YTDLP_URLS);
  if (name === "ffprobe") return getPlatformVariant(FFPROBE_URLS);
  return getPlatformVariant(FFMPEG_URLS);
}

async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);

  const totalBytes = Number(response.headers.get("content-length") ?? 0);
  let downloadedBytes = 0;

  const reader = response.body!.getReader();
  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      downloadedBytes += value.byteLength;
      if (totalBytes > 0 && onProgress) {
        onProgress(Math.round((downloadedBytes / totalBytes) * 100));
      }
      controller.enqueue(value);
    },
  });

  const nodeStream = Readable.fromWeb(stream as any);

  if (url.endsWith(".gz")) {
    const { createGunzip } = await import("node:zlib");
    await pipeline(nodeStream, createGunzip(), createWriteStream(destPath));
  } else {
    await pipeline(nodeStream, createWriteStream(destPath));
  }

  if (process.platform !== "win32") {
    chmodSync(destPath, 0o755);
  }

  if (process.platform === "darwin") {
    try {
      await exec("xattr", ["-d", "com.apple.quarantine", destPath]);
    } catch {}
  }
}

async function tryPipInstall(): Promise<boolean> {
  const python = await findPython();

  const strategies = [
    [
      python,
      "-m",
      "pip",
      "install",
      "--user",
      "--break-system-packages",
      "yt-dlp",
    ],
    [python, "-m", "pip", "install", "--user", "yt-dlp"],
  ];

  let installed = false;
  for (const args of strategies) {
    if (installed) break;
    try {
      await exec(args[0], args.slice(1), { timeout: 120_000 });
      installed = true;
    } catch (err) {
      console.warn(
        `pip install strategy failed (${args.slice(2, 5).join(" ")}):`,
        err,
      );
    }
  }

  if (!installed) return false;

  const pipBinDir = await getPipUserBinDir(python);
  if (pipBinDir) {
    const pipYtdlp = join(pipBinDir, "yt-dlp");
    const localBin = getLocalBinDir();
    const localYtdlp = join(localBin, "yt-dlp");

    if (existsSync(pipYtdlp) && pipBinDir !== localBin) {
      await mkdir(localBin, { recursive: true });
      try {
        await unlink(localYtdlp);
      } catch {}
      await symlink(pipYtdlp, localYtdlp);
    }
  }

  return true;
}

export async function ensureDeno(): Promise<void> {
  const denoPath = getDenoPath();
  if (existsSync(denoPath)) return;

  const dir = getLocalBinDir();
  await mkdir(dir, { recursive: true });

  const url = getPlatformVariant(DENO_URLS);
  const zipPath = join(dir, "deno-download.zip");

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const nodeStream = Readable.fromWeb(response.body as any);
  await pipeline(nodeStream, createWriteStream(zipPath));

  if (process.platform === "win32") {
    await exec("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Force -Path "${zipPath}" -DestinationPath "${dir}"`,
    ]);
  } else {
    await exec("unzip", ["-o", zipPath, "-d", dir]);
    chmodSync(denoPath, 0o755);
  }

  try {
    await unlink(zipPath);
  } catch {}
}

export async function downloadBinary(
  name: BinaryName,
  onProgress?: (percent: number) => void,
): Promise<boolean> {
  clearPathCache(name);
  try {
    if (name === "yt-dlp") {
      const pipSuccess = await tryPipInstall();
      if (pipSuccess) return true;
    }

    const dir = getLocalBinDir();
    await mkdir(dir, { recursive: true });
    await downloadFile(getDownloadUrl(name), getLocalBinPath(name), onProgress);

    if (name === "yt-dlp") {
      await ensureDeno().catch((err) =>
        console.error("Failed to install Deno:", err),
      );
    }

    return true;
  } catch (err) {
    console.error(`Failed to download ${name}:`, err);
    return false;
  }
}

export async function updateBinary(name: BinaryName): Promise<boolean> {
  clearPathCache(name);

  if (name === "yt-dlp") {
    if (await tryPipInstall()) return true;

    const binPath = await getSpawnPath(name);
    try {
      await exec(binPath, ["--update"]);
      return true;
    } catch {
      return downloadBinary(name);
    }
  }

  return downloadBinary(name);
}

export async function uninstallBinary(name: BinaryName): Promise<boolean> {
  clearPathCache(name);
  let removed = false;

  if (name === "yt-dlp") {
    try {
      await exec("pip3", ["uninstall", "-y", "yt-dlp"], { timeout: 30_000 });
      removed = true;
    } catch {}
  }

  const localBinDir = getLocalBinDir();
  const localPath = getLocalBinPath(name);

  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const { stdout } = await exec(cmd, [name]);
    const resolvedPath = stdout.trim().split("\n")[0];
    if (resolvedPath?.startsWith(localBinDir)) {
      await unlink(resolvedPath);
      removed = true;
    }
  } catch {}

  try {
    await unlink(localPath);
    removed = true;
  } catch {}

  return removed;
}
