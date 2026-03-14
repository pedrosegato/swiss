import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getLocalBinDir, getLocalBinPath, findPython } from "./platform";

const exec = promisify(execFile);

export type BinaryName = "yt-dlp" | "ffmpeg" | "ffprobe";

export interface BinaryStatus {
  installed: boolean;
  version: string | null;
  path: string;
  source: "system" | "local" | "none";
}

export interface SpawnInfo {
  command: string;
  prefixArgs: string[];
}

async function tryGetVersion(
  binPath: string,
  versionFlag = "--version",
): Promise<string | null> {
  try {
    const { stdout } = await exec(binPath, [versionFlag]);
    const firstLine = stdout.trim().split("\n")[0];
    const ffmpegMatch = firstLine.match(/^ffmpeg version (\S+)/);
    return ffmpegMatch ? ffmpegMatch[1] : firstLine;
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
let ytdlpSpawnCache: SpawnInfo | null = null;

export function clearPathCache(name?: BinaryName) {
  if (name) {
    pathCache.delete(name);
    if (name === "yt-dlp") ytdlpSpawnCache = null;
  } else {
    pathCache.clear();
    ytdlpSpawnCache = null;
  }
}

export async function getSpawnPath(name: BinaryName): Promise<string> {
  const cached = pathCache.get(name);
  if (cached) return cached;
  const status = await resolveBinary(name);
  if (status.installed) pathCache.set(name, status.path);
  return status.path;
}

async function canUsePipModule(): Promise<string | null> {
  if (process.platform === "win32") return null;
  const python = await findPython();
  try {
    await exec(python, ["-m", "yt_dlp", "--version"], { timeout: 5_000 });
    return python;
  } catch {
    return null;
  }
}

export async function getYtdlpSpawnInfo(): Promise<SpawnInfo> {
  if (ytdlpSpawnCache) return ytdlpSpawnCache;

  const python = await canUsePipModule();
  if (python) {
    ytdlpSpawnCache = { command: python, prefixArgs: ["-m", "yt_dlp"] };
    return ytdlpSpawnCache;
  }

  const binPath = await getSpawnPath("yt-dlp");
  ytdlpSpawnCache = { command: binPath, prefixArgs: [] };
  return ytdlpSpawnCache;
}

export function getDenoPath(): string {
  return getLocalBinPath("deno");
}
