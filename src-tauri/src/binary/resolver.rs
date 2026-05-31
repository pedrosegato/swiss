use super::{BinaryName, BinarySource, BinaryStatus, SpawnInfo};
use crate::platform::{find_python, get_local_bin_dir, get_local_bin_path};
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::process::Command;

static PATH_CACHE: Lazy<Mutex<HashMap<BinaryName, String>>> = Lazy::new(Default::default);
static YTDLP_SPAWN_CACHE: Lazy<Mutex<Option<SpawnInfo>>> = Lazy::new(Default::default);

pub fn clear_path_cache(name: Option<BinaryName>) {
    let mut g = PATH_CACHE.lock().unwrap();
    match name {
        Some(n) => {
            g.remove(&n);
            if n == BinaryName::YtDlp {
                *YTDLP_SPAWN_CACHE.lock().unwrap() = None;
            }
        }
        None => {
            g.clear();
            *YTDLP_SPAWN_CACHE.lock().unwrap() = None;
        }
    }
}

async fn try_version(bin: &str, flag: &str) -> Option<String> {
    let out = Command::new(bin).arg(flag).output().await.ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout);
    let first = s.lines().next()?.trim().to_string();
    static FFMPEG_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^ffmpeg version (\S+)").unwrap());
    Some(
        FFMPEG_RE
            .captures(&first)
            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
            .unwrap_or(first),
    )
}

async fn which_binary(name: &str) -> Option<String> {
    let cmd = if cfg!(windows) { "where" } else { "which" };
    let out = Command::new(cmd).arg(name).output().await.ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout);
    s.lines().next().map(|l| l.trim().to_string())
}

pub async fn resolve_binary(name: BinaryName) -> BinaryStatus {
    let flag = name.version_flag();
    let local_bin_dir = get_local_bin_dir();
    let local_path = get_local_bin_path(name.as_str());

    if let Some(version) = try_version(name.as_str(), flag).await {
        let resolved = which_binary(name.as_str()).await;
        let path_str = resolved.clone().unwrap_or_else(|| name.as_str().into());
        let is_local = resolved
            .as_deref()
            .map(|p| p.starts_with(local_bin_dir.to_string_lossy().as_ref()))
            .unwrap_or(false);
        return BinaryStatus {
            installed: true,
            version: Some(version),
            path: path_str,
            source: if is_local {
                BinarySource::Local
            } else {
                BinarySource::System
            },
        };
    }

    let max_attempts = if cfg!(windows) { 3 } else { 1 };
    for attempt in 0..max_attempts {
        if attempt > 0 {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
        if let Some(v) = try_version(local_path.to_string_lossy().as_ref(), flag).await {
            return BinaryStatus {
                installed: true,
                version: Some(v),
                path: local_path.to_string_lossy().into(),
                source: BinarySource::Local,
            };
        }
    }

    if cfg!(windows) && local_path.exists() {
        return BinaryStatus {
            installed: true,
            version: Some("installed".into()),
            path: local_path.to_string_lossy().into(),
            source: BinarySource::Local,
        };
    }

    BinaryStatus {
        installed: false,
        version: None,
        path: local_path.to_string_lossy().into(),
        source: BinarySource::None,
    }
}

pub async fn get_spawn_path(name: BinaryName) -> String {
    if let Some(p) = PATH_CACHE.lock().unwrap().get(&name).cloned() {
        return p;
    }
    let status = resolve_binary(name).await;
    if status.installed {
        PATH_CACHE.lock().unwrap().insert(name, status.path.clone());
    }
    status.path
}

async fn can_use_pip_module() -> Option<String> {
    if cfg!(windows) {
        return None;
    }
    let python = find_python().await;
    let out = Command::new(&python)
        .args(["-m", "yt_dlp", "--version"])
        .output()
        .await
        .ok()?;
    if out.status.success() {
        Some(python)
    } else {
        None
    }
}

async fn try_install_pip_module() -> Option<String> {
    if cfg!(windows) {
        return None;
    }
    let python = find_python().await;
    Command::new(&python)
        .args(["-m", "pip", "--version"])
        .output()
        .await
        .ok()?;

    let strategies = [
        vec![
            "-m",
            "pip",
            "install",
            "--user",
            "--break-system-packages",
            "yt-dlp",
        ],
        vec!["-m", "pip", "install", "--user", "yt-dlp"],
    ];
    for args in strategies {
        if Command::new(&python)
            .args(&args)
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
            && Command::new(&python)
                .args(["-m", "yt_dlp", "--version"])
                .output()
                .await
                .map(|o| o.status.success())
                .unwrap_or(false)
        {
            return Some(python);
        }
    }
    None
}

pub async fn get_ytdlp_spawn_info() -> SpawnInfo {
    if let Some(c) = YTDLP_SPAWN_CACHE.lock().unwrap().clone() {
        return c;
    }

    let python = match can_use_pip_module().await {
        Some(p) => Some(p),
        None => try_install_pip_module().await,
    };

    let info = if let Some(python) = python {
        SpawnInfo {
            command: python,
            prefix_args: vec!["-m".into(), "yt_dlp".into()],
        }
    } else {
        SpawnInfo {
            command: get_spawn_path(BinaryName::YtDlp).await,
            prefix_args: vec![],
        }
    };
    *YTDLP_SPAWN_CACHE.lock().unwrap() = Some(info.clone());
    info
}
