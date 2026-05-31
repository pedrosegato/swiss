use super::{
    resolver::{clear_path_cache, get_spawn_path},
    BinaryName,
};
use crate::error::AppResult;
use crate::platform::{
    current_arch, current_os, find_python, get_local_bin_dir, get_local_bin_path,
    get_pip_user_bin_dir, platform_variant,
};
use futures_util::StreamExt;
use std::collections::HashMap;
use std::path::Path;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

fn ytdlp_urls() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        (
            "darwin-arm64",
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
        ),
        (
            "darwin-x64",
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
        ),
        (
            "win32-x64",
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
        ),
        (
            "linux-x64",
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux",
        ),
    ])
}

fn ffmpeg_urls() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        (
            "darwin-arm64",
            "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffmpeg-osx-arm64",
        ),
        (
            "darwin-x64",
            "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffmpeg-osx-x64",
        ),
        (
            "win32-x64",
            "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffmpeg-win-x64.exe",
        ),
        (
            "linux-x64",
            "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffmpeg-linux-x64",
        ),
    ])
}

fn ffprobe_urls() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        (
            "darwin-arm64",
            "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffprobe-osx-arm64",
        ),
        (
            "darwin-x64",
            "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffprobe-osx-x64",
        ),
        (
            "win32-x64",
            "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffprobe-win-x64.exe",
        ),
        (
            "linux-x64",
            "https://github.com/shaka-project/static-ffmpeg-binaries/releases/latest/download/ffprobe-linux-x64",
        ),
    ])
}

fn download_url(name: BinaryName) -> String {
    let os = current_os();
    let arch = current_arch();
    match name {
        BinaryName::YtDlp => platform_variant(&ytdlp_urls(), os, arch).to_string(),
        BinaryName::Ffmpeg => platform_variant(&ffmpeg_urls(), os, arch).to_string(),
        BinaryName::Ffprobe => platform_variant(&ffprobe_urls(), os, arch).to_string(),
    }
}

pub async fn download_file<F: Fn(u32)>(url: &str, dest: &Path, on_progress: F) -> AppResult<()> {
    let resp = reqwest::Client::new()
        .get(url)
        .send()
        .await?
        .error_for_status()?;
    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();

    let mut file = fs::File::create(dest).await?;
    while let Some(chunk) = stream.next().await {
        let bytes = chunk?;
        downloaded += bytes.len() as u64;
        file.write_all(&bytes).await?;
        if let Some(pct) = (downloaded * 100).checked_div(total) {
            on_progress(pct as u32);
        }
    }
    file.flush().await?;
    drop(file);

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(dest)?.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(dest, perms)?;
    }

    if cfg!(target_os = "macos") {
        let _ = Command::new("xattr")
            .args(["-d", "com.apple.quarantine"])
            .arg(dest)
            .output()
            .await;
    }

    Ok(())
}

async fn try_pip_install() -> bool {
    let python = find_python().await;
    let strategies = [
        vec![
            "-m",
            "pip",
            "install",
            "--user",
            "--upgrade",
            "--break-system-packages",
            "yt-dlp",
        ],
        vec!["-m", "pip", "install", "--user", "--upgrade", "yt-dlp"],
    ];
    let mut installed = false;
    for args in strategies {
        if installed {
            break;
        }
        if Command::new(&python)
            .args(&args)
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            installed = true;
        }
    }
    if !installed {
        return false;
    }

    if let Some(pip_bin_dir) = get_pip_user_bin_dir(&python).await {
        let pip_ytdlp = pip_bin_dir.join("yt-dlp");
        let local_bin = get_local_bin_dir();
        let local_ytdlp = local_bin.join("yt-dlp");
        if pip_ytdlp.exists() && pip_bin_dir != local_bin {
            let _ = fs::create_dir_all(&local_bin).await;
            let _ = fs::remove_file(&local_ytdlp).await;
            #[cfg(unix)]
            let _ = tokio::fs::symlink(&pip_ytdlp, &local_ytdlp).await;
        }
    }
    true
}

pub async fn download_binary<F: Fn(u32) + Send + 'static>(
    name: BinaryName,
    on_progress: F,
) -> bool {
    clear_path_cache(Some(name));
    if name == BinaryName::YtDlp && try_pip_install().await {
        return true;
    }
    let dir = get_local_bin_dir();
    if fs::create_dir_all(&dir).await.is_err() {
        return false;
    }
    let dest = get_local_bin_path(name.as_str());
    download_file(&download_url(name), &dest, on_progress)
        .await
        .is_ok()
}

pub async fn update_binary(name: BinaryName) -> bool {
    clear_path_cache(Some(name));
    if name == BinaryName::YtDlp {
        if try_pip_install().await {
            return true;
        }
        let bin_path = get_spawn_path(name).await;
        if Command::new(&bin_path)
            .arg("--update")
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return true;
        }
    }
    download_binary(name, |_| {}).await
}

pub async fn uninstall_binary(name: BinaryName) -> bool {
    clear_path_cache(Some(name));
    let mut removed = false;
    if name == BinaryName::YtDlp
        && Command::new("pip3")
            .args(["uninstall", "-y", "yt-dlp"])
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
    {
        removed = true;
    }
    let local_bin_dir = get_local_bin_dir();
    let local_path = get_local_bin_path(name.as_str());
    let cmd = if cfg!(windows) { "where" } else { "which" };
    if let Ok(out) = Command::new(cmd).arg(name.as_str()).output().await {
        if let Some(line) = String::from_utf8_lossy(&out.stdout).lines().next() {
            let resolved = line.trim();
            if resolved.starts_with(local_bin_dir.to_string_lossy().as_ref())
                && fs::remove_file(resolved).await.is_ok()
            {
                removed = true;
            }
        }
    }
    if fs::remove_file(&local_path).await.is_ok() {
        removed = true;
    }
    removed
}
