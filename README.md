<p align="center">
  <img src="build/icon.png" width="128" height="128" alt="Swiss">
</p>

<h1 align="center">swiss</h1>

<p align="center">Desktop app for downloading videos and converting media files.<br>Built with Tauri v2, React, and TypeScript.</p>
<br>
Uses <a href="https://github.com/yt-dlp/yt-dlp">yt-dlp</a> for downloading from 1000+ sites and <a href="https://github.com/FFmpeg/FFmpeg">ffmpeg</a> for format conversion. Both binaries are managed automatically — installed on first launch if not already present.

## Features

- **Downloader** — Paste a URL, pick format (mp4, mkv, webm, mp3, wav, flac, aac) and quality, download. Supports all sites yt-dlp supports (YouTube, Twitter/X, Instagram, TikTok, etc). Cookie-based auth for private/age-restricted content.
- **Converter** — Drag & drop files, choose output format (mp4, mkv, avi, webm, mov, mp3, wav, flac, aac, wma), convert. Batch processing supported.
- **Merger** — Combine multiple video/audio tracks into a single output via ffmpeg.
- **Settings** — Download path, cookie browser selection, binary management (install/update/uninstall yt-dlp and ffmpeg), auto-updates.

## Tech Stack

| Layer     | Tech                                            |
| --------- | ----------------------------------------------- |
| Shell     | Tauri v2 (Rust)                                 |
| UI        | React 18, TypeScript, Tailwind CSS 4, shadcn/ui |
| Routing   | TanStack Router (file-based)                    |
| State     | Zustand (persisted to localStorage)             |
| Build     | Vite + @tauri-apps/cli                          |
| Packaging | tauri-bundler (dmg/nsis/AppImage)               |
| Updates   | tauri-plugin-updater (GitHub Releases)          |

## Installation

Download the latest release from [GitHub Releases](https://github.com/pedrosegato/swiss/releases).

### macOS

The app is not code-signed. macOS will block it on first open. To fix:

```bash
xattr -cr /Applications/Swiss.app
```

## Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)
- Rust ≥ 1.77 via [rustup](https://rustup.rs)
- Platform webview dependencies:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `webkit2gtk-4.1`, `libsoup-3.0`, `librsvg2`, `patchelf`, `file`
  - **Windows**: [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 11)

### Run in dev mode

```bash
pnpm install
pnpm dev        # runs tauri dev (Vite + Rust hot-reload)
```

### Build a release bundle

```bash
pnpm build      # runs tauri build
```

Output: `src-tauri/target/release/bundle/`
- macOS: `dmg/Swiss_<ver>_aarch64.dmg`
- Windows: `nsis/Swiss_<ver>_x64-setup.exe`
- Linux: `appimage/Swiss_<ver>_amd64.AppImage`
