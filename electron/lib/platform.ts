import { app } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

const exec = promisify(execFile);

export function getLocalBinDir(): string {
  if (process.platform === "win32") {
    return join(app.getPath("appData"), "..", "Local", "Programs");
  }
  return join(process.env.HOME ?? "/usr/local", ".local", "bin");
}

export function getLocalBinPath(name: string): string {
  const ext = process.platform === "win32" ? ".exe" : "";
  return join(getLocalBinDir(), `${name}${ext}`);
}

export function getPlatformVariant(variants: Record<string, string>): string {
  const key = `${process.platform}-${process.arch}`;
  return variants[key] ?? variants["linux-x64"];
}

const PYTHON_CANDIDATES = [
  "/opt/homebrew/bin/python3",
  "/usr/local/bin/python3",
  "python3",
];

export async function findPython(): Promise<string> {
  for (const py of PYTHON_CANDIDATES) {
    try {
      await exec(py, ["--version"]);
      return py;
    } catch {}
  }
  return "python3";
}

export async function getPipUserBinDir(python: string): Promise<string | null> {
  try {
    const { stdout } = await exec(python, ["-m", "site", "--user-base"]);
    return join(stdout.trim(), "bin");
  } catch {
    return null;
  }
}
