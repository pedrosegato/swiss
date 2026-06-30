<p align="center">
  <img src="build/icon.png" width="128" height="128" alt="Swiss">
</p>

<h1 align="center">swiss</h1>

<p align="center">Desktop app to download videos, merge tracks, and convert media.<br>Built with Tauri v2, React, and TypeScript — developed with AI assistance.</p>

Powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp) (downloads from 1000+ sites) and [ffmpeg](https://github.com/FFmpeg/FFmpeg) (conversion). Both binaries install automatically on first launch.

## Features

- **Download** — Paste a URL, pick format and quality. Cookie auth for private content.
- **Merge** — Combine video/audio tracks into one output.
- **Convert** — Drag & drop files, choose output format. Batch supported.

## Tech Stack

Tauri v2 (Rust) · React 18 · TypeScript · Tailwind 4 · shadcn/ui · TanStack Router · Zustand · Vite

## Install

Grab the latest [release](https://github.com/pedrosegato/swiss/releases).

**macOS** — the app isn't code-signed, so unblock it on first open:

```bash
xattr -cr /Applications/Swiss.app
```

## Development

Requires Node ≥ 20, pnpm ≥ 9, Rust ≥ 1.77, and platform webview deps ([Tauri prerequisites](https://tauri.app/start/prerequisites/)).

```bash
pnpm install
pnpm dev        # tauri dev (Vite + Rust hot-reload)
pnpm build      # release bundle → src-tauri/target/release/bundle/
```
