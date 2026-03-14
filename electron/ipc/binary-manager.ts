import { app } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createWriteStream, chmodSync, existsSync } from "node:fs";
import { mkdir, unlink, readFile, appendFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const exec = promisify(execFile);

type BinaryName = "yt-dlp" | "ffmpeg" | "ffprobe";

export interface BinaryStatus {
  installed: boolean;
  version: string | null;
  path: string;
  source: "system" | "local" | "none";
}

function getLocalBinDir(): string {
  if (process.platform === "win32") {
    return join(app.getPath("appData"), "..", "Local", "Programs");
  }
  return join(process.env.HOME ?? "/usr/local", ".local", "bin");
}

function getLocalBinPath(name: BinaryName): string {
  const ext = process.platform === "win32" ? ".exe" : "";
  return join(getLocalBinDir(), `${name}${ext}`);
}

async function tryGetVersion(
  binPath: string,
  versionFlag = "--version",
): Promise<string | null> {
  try {
    const { stdout } = await exec(binPath, [versionFlag]);
    const firstLine = stdout.trim().split("\n")[0];
    const ffmpegMatch = firstLine.match(/^ffmpeg version (\S+)/);
    if (ffmpegMatch) return ffmpegMatch[1];
    return firstLine;
  } catch {
    return null;
  }
}

async function whichBinary(name: string): Promise<string | null> {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const { stdout } = await exec(cmd, [name]);
    return stdout.trim().split("\n")[0] || null;
  } catch {
    return null;
  }
}

export async function resolveBinary(name: BinaryName): Promise<BinaryStatus> {
  const versionFlag =
    name === "ffmpeg" || name === "ffprobe" ? "-version" : "--version";
  const localBinDir = getLocalBinDir();

  const systemVersion = await tryGetVersion(name, versionFlag);
  if (systemVersion) {
    const resolvedPath = await whichBinary(name);
    const isLocal = resolvedPath?.startsWith(localBinDir);
    return {
      installed: true,
      version: systemVersion,
      path: resolvedPath ?? name,
      source: isLocal ? "local" : "system",
    };
  }

  const localPath = getLocalBinPath(name);
  const localVersion = await tryGetVersion(localPath, versionFlag);
  if (localVersion) {
    return {
      installed: true,
      version: localVersion,
      path: localPath,
      source: "local",
    };
  }

  return { installed: false, version: null, path: localPath, source: "none" };
}

const pathCache = new Map<BinaryName, string>();

export function clearPathCache(name?: BinaryName) {
  if (name) pathCache.delete(name);
  else pathCache.clear();
}

export async function getSpawnPath(name: BinaryName): Promise<string> {
  const cached = pathCache.get(name);
  if (cached) return cached;
  const status = await resolveBinary(name);
  if (status.installed) pathCache.set(name, status.path);
  return status.path;
}

function getDownloadUrl(name: BinaryName): string {
  const platform = process.platform;
  const arch = process.arch;

  if (name === "yt-dlp") {
    const variants: Record<string, string> = {
      "darwin-arm64":
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
      "darwin-x64":
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
      "win32-x64":
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
      "linux-x64":
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux",
    };
    return variants[`${platform}-${arch}`] ?? variants["linux-x64"];
  }

  const ffmpegVariants: Record<string, string> = {
    "darwin-arm64":
      "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-darwin-arm64.gz",
    "darwin-x64":
      "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-darwin-x64.gz",
    "win32-x64":
      "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-win32-x64.gz",
    "linux-x64":
      "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-linux-x64.gz",
  };
  return ffmpegVariants[`${platform}-${arch}`] ?? ffmpegVariants["linux-x64"];
}

async function ensureShellPath(): Promise<void> {
  if (process.platform === "win32") return;

  const home = process.env.HOME;
  if (!home) return;

  const binDir = getLocalBinDir();
  const exportLine = `export PATH="${binDir}:$PATH"`;

  const rcFiles = [join(home, ".zshrc"), join(home, ".bashrc")];

  for (const rcFile of rcFiles) {
    if (!existsSync(rcFile)) continue;

    const content = await readFile(rcFile, "utf-8");
    if (content.includes(".local/bin")) continue;

    await appendFile(rcFile, `\n# Added by Swiss\n${exportLine}\n`);
  }
}

async function findPython(): Promise<string> {
  const candidates = [
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    "python3",
  ];
  for (const py of candidates) {
    try {
      await exec(py, ["--version"]);
      return py;
    } catch {}
  }
  return "python3";
}

async function getPipUserBinDir(python: string): Promise<string | null> {
  try {
    const { stdout } = await exec(python, ["-m", "site", "--user-base"]);
    return join(stdout.trim(), "bin");
  } catch {
    return null;
  }
}

async function tryPipInstall(): Promise<boolean> {
  const python = await findPython();

  const argVariants = [
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
  for (const args of argVariants) {
    if (installed) break;
    try {
      await exec(args[0], args.slice(1), { timeout: 120_000 });
      installed = true;
    } catch {}
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

  return installed;
}

async function downloadBinaryFile(
  url: string,
  destPath: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

export async function downloadBinary(
  name: BinaryName,
  onProgress?: (percent: number) => void,
): Promise<boolean> {
  clearPathCache(name);
  try {
    if (name === "yt-dlp") {
      const pipSuccess = await tryPipInstall();
      if (pipSuccess) {
        await ensureShellPath();
        return true;
      }
    }

    const dir = getLocalBinDir();
    await mkdir(dir, { recursive: true });

    const url = getDownloadUrl(name);
    const destPath = getLocalBinPath(name);
    await downloadBinaryFile(url, destPath, onProgress);

    await ensureShellPath();
    return true;
  } catch (err) {
    console.error(`Failed to download ${name}:`, err);
    return false;
  }
}

export async function updateBinary(name: BinaryName): Promise<boolean> {
  clearPathCache(name);
  if (name === "yt-dlp") {
    const pipSuccess = await tryPipInstall();
    if (pipSuccess) return true;

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
  const resolvedPath = await whichBinary(name);
  if (resolvedPath && resolvedPath.startsWith(localBinDir)) {
    try {
      await unlink(resolvedPath);
      removed = true;
    } catch {}
  }

  try {
    const localPath = getLocalBinPath(name);
    await unlink(localPath);
    removed = true;
  } catch {}

  return removed;
}
