# Electron → Tauri v2 Migration Notes

**Completed:** 2026-05-30  
**Branch:** `release/tauri` (base: `c76ed5f`)  
**Final phase commit parent:** `6fa0bf5`

---

## Summary

Swiss was migrated from Electron 30 to Tauri v2 across 10 phases, all merged into `release/tauri`. The app's Rust backend replaces the Electron main process; the React/TypeScript frontend is unchanged except for IPC rewiring (from `ipcRenderer` to `@tauri-apps/api`).

### Phases merged to `release/tauri`

| Phase | Commit | Description |
|-------|--------|-------------|
| 1 | `63fb31b` | Scaffold `src-tauri` workspace |
| 2 | `74b2617` | Rust foundation modules (state, error types, config) |
| 3 | `43d4751` | Binary resolver + installer (yt-dlp, ffmpeg) |
| 4 | `fdbf19e` | Non-streaming commands + app lifecycle |
| 5 | `f203dbc` | Streaming commands (download/convert/merge via channels) |
| 6 | `98fdbfc` | Updater plugin + minisign keypair |
| 7 | `7ed1669` | Frontend IPC rewire (ipcRenderer → `@tauri-apps/api`) |
| 8 | `93af427` | Decommission Electron (remove all electron deps) |
| 9 | `6fa0bf5` | CI: replace electron-builder workflow with tauri-action |
| 10 | this branch | Docs + bundle-size verification |

---

## What Was Verified Automatically

- **`cargo test`**: All Rust unit tests pass (run during CI for each phase PR).
- **`cargo clippy`**: No warnings/errors on the final build.
- **`pnpm dev` / `tauri dev`**: App launches with no `ipcRenderer` crash; all routes load; download, convert, and merge flows work in dev mode.
- **`tsc --noEmit`**: TypeScript compiles clean (checked via `pnpm lint`).
- **Release build**: `pnpm tauri build` completes successfully on macOS aarch64.

---

## Bundle Size Delta

| Artifact | Size |
|----------|------|
| Tauri dmg (`Swiss_0.7.4_aarch64.dmg`) | **3.9 MB** |
| Tauri binary (`src-tauri/target/release/swiss`) | 8.1 MB |
| Old Electron dmg (0.7.3) | not on disk (only `.blockmap` + `latest-mac.yml` remain) |

The old Electron `.app` was typically ~150–160 MB (bundled Chromium + Node). At 3.9 MB for the installer dmg, the Tauri build achieves the target reduction of ~97% in installer size. The app bundle itself (`.app`) is cleaned by tauri-bundler after dmg creation; the raw binary is 8.1 MB.

No old Electron dmg binary was present on disk for a direct file-level comparison. The blockmap for `Swiss-Mac-0.7.3-Installer.dmg` is present at `release/0.7.3/`, confirming the dmg existed and was the Electron build.

---

## Deferred to Release Time (Pedro's Gate — NOT Blockers)

These items are not required before merging `release/tauri` → `main`. They gate the first public Tauri release.

- **Tag-triggered multi-platform CI release build**: Push a `v*` tag to trigger `.github/workflows/build.yml` (tauri-action). This produces signed Windows NSIS, Linux AppImage, and macOS dmg artifacts.
- **Auto-updater end-to-end**: Requires two tagged releases published (not draft). The `/releases/latest/download/latest.json` updater endpoint only resolves for **published** releases — drafts are invisible to the updater.
- **Cross-platform (Windows/Linux) functional QA**: Done via CI artifacts from the tag build above.
- **macOS code-signing/notarization**: Not configured. Parity: the old Electron build was also unsigned. Users run `xattr -cr /Applications/Swiss.app` to clear quarantine.
- **Manual GUI functional QA**: Real download/conversion/merge flows on a production build, with actual network calls. Dev-mode smoke testing was done; release-build GUI QA is deferred.

---

## Architecture Change Summary

| Concern | Before (Electron) | After (Tauri v2) |
|---------|-------------------|-----------------|
| Shell runtime | Node.js + Chromium (~150 MB) | Rust + OS webview (~4 MB) |
| IPC | `ipcMain` / `ipcRenderer` | Tauri commands + channels |
| Binary management | Node `child_process` | Rust `Command` + `tauri-plugin-shell` |
| Auto-updates | `electron-updater` | `tauri-plugin-updater` |
| File dialogs | `electron.dialog` | `tauri-plugin-dialog` |
| App data paths | `app.getPath()` | `tauri::path` API |
| Packaging | `electron-builder` | `tauri-bundler` |
| CI | `electron-builder` action | `tauri-action` |
