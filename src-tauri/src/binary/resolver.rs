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
    let clear_ytdlp = match name {
        Some(n) => {
            PATH_CACHE.lock().unwrap().remove(&n);
            n == BinaryName::YtDlp
        }
        None => {
            PATH_CACHE.lock().unwrap().clear();
            true
        }
    };
    if clear_ytdlp {
        *YTDLP_SPAWN_CACHE.lock().unwrap() = None;
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

pub(crate) async fn which_binary(name: &str) -> Option<String> {
    let cmd = if cfg!(windows) { "where" } else { "which" };
    let out = Command::new(cmd).arg(name).output().await.ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout);
    s.lines().next().map(|l| l.trim().to_string())
}

pub(crate) struct PipInstallOpts {
    pub upgrade: bool,
    pub timeout: Option<std::time::Duration>,
    pub windows_enabled: bool,
}

pub(crate) fn install_strategies(opts: &PipInstallOpts) -> Vec<Vec<String>> {
    let build = |break_system_packages: bool| {
        let mut args = vec![
            "-m".to_string(),
            "pip".to_string(),
            "install".to_string(),
            "--user".to_string(),
        ];
        if opts.upgrade {
            args.push("--upgrade".to_string());
        }
        if break_system_packages {
            args.push("--break-system-packages".to_string());
        }
        args.push("yt-dlp".to_string());
        args
    };
    vec![build(true), build(false)]
}

pub(crate) async fn python_has_ytdlp(python: &str, timeout: Option<std::time::Duration>) -> bool {
    let run = Command::new(python)
        .args(["-m", "yt_dlp", "--version"])
        .output();
    let output = match timeout {
        Some(d) => tokio::time::timeout(d, run).await.ok().and_then(|r| r.ok()),
        None => run.await.ok(),
    };
    output.map(|o| o.status.success()).unwrap_or(false)
}

pub(crate) async fn pip_install_ytdlp(python: &str, opts: &PipInstallOpts) -> bool {
    if cfg!(windows) && !opts.windows_enabled {
        return false;
    }
    for args in install_strategies(opts) {
        let run = Command::new(python).args(&args).output();
        let installed = match opts.timeout {
            Some(d) => tokio::time::timeout(d, run).await.ok().and_then(|r| r.ok()),
            None => run.await.ok(),
        }
        .map(|o| o.status.success())
        .unwrap_or(false);
        if installed && python_has_ytdlp(python, opts.timeout).await {
            return true;
        }
    }
    false
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

async fn resolve_pip_python() -> Option<String> {
    if cfg!(windows) {
        return None;
    }
    let python = find_python().await;
    if python_has_ytdlp(&python, None).await {
        return Some(python);
    }
    let opts = PipInstallOpts {
        upgrade: false,
        timeout: None,
        windows_enabled: false,
    };
    if pip_install_ytdlp(&python, &opts).await {
        return Some(python);
    }
    None
}

pub async fn get_ytdlp_spawn_info() -> SpawnInfo {
    if let Some(c) = YTDLP_SPAWN_CACHE.lock().unwrap().clone() {
        return c;
    }

    let python = resolve_pip_python().await;

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

#[cfg(test)]
mod tests {
    use super::*;

    fn opts(upgrade: bool) -> PipInstallOpts {
        PipInstallOpts {
            upgrade,
            timeout: None,
            windows_enabled: false,
        }
    }

    #[test]
    fn install_strategies_adds_upgrade_only_when_requested() {
        let upgraded = install_strategies(&opts(true));
        assert!(upgraded
            .iter()
            .all(|s| s.contains(&"--upgrade".to_string())));

        let plain = install_strategies(&opts(false));
        assert!(plain
            .iter()
            .all(|s| !s.contains(&"--upgrade".to_string())));
    }

    #[test]
    fn install_strategies_covers_break_system_and_plain() {
        let strategies = install_strategies(&opts(false));
        assert_eq!(strategies.len(), 2);
        assert!(strategies
            .iter()
            .any(|s| s.contains(&"--break-system-packages".to_string())));
        assert!(strategies
            .iter()
            .any(|s| !s.contains(&"--break-system-packages".to_string())));
        assert!(strategies
            .iter()
            .all(|s| s.last() == Some(&"yt-dlp".to_string())));
    }
}
