use crate::binary::{
    BinaryName, BinarySource, BinaryStatus,
    installer::{download_binary, update_binary, uninstall_binary},
    resolver::resolve_binary,
};
use crate::error::AppResult;
use crate::progress::BinaryInstallProgress;
use serde::Serialize;
use std::str::FromStr;
use tauri::ipc::Channel;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub ytdlp: BinaryStatus,
    pub ffmpeg: BinaryStatus,
    pub ffprobe: BinaryStatus,
}

#[tauri::command]
pub async fn binaries_check() -> AppResult<CheckResult> {
    let (ytdlp, ffmpeg, ffprobe) = tokio::join!(
        resolve_binary(BinaryName::YtDlp),
        resolve_binary(BinaryName::Ffmpeg),
        resolve_binary(BinaryName::Ffprobe),
    );
    Ok(CheckResult { ytdlp, ffmpeg, ffprobe })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub success: bool,
    #[serde(flatten)]
    pub status: BinaryStatus,
}

fn name_from(name: &str) -> AppResult<BinaryName> {
    BinaryName::from_str(name).map_err(|e| crate::error::AppError::Other(e))
}

#[tauri::command]
pub async fn binaries_install(
    name: String,
    on_event: Channel<BinaryInstallProgress>,
) -> AppResult<InstallResult> {
    let n = name_from(&name)?;
    let name_clone = name.clone();
    let success = download_binary(n, move |percent| {
        let _ = on_event.send(BinaryInstallProgress { name: name_clone.clone(), percent });
    }).await;

    if success {
        if cfg!(windows) {
            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        }
        let status = resolve_binary(n).await;
        Ok(InstallResult { success: true, status })
    } else {
        Ok(InstallResult {
            success: false,
            status: BinaryStatus {
                installed: false,
                version: None,
                path: String::new(),
                source: BinarySource::None,
            },
        })
    }
}

#[tauri::command]
pub async fn binaries_uninstall(name: String) -> AppResult<InstallResult> {
    let n = name_from(&name)?;
    let success = uninstall_binary(n).await;
    let status = if success {
        resolve_binary(n).await
    } else {
        BinaryStatus {
            installed: false,
            version: None,
            path: String::new(),
            source: BinarySource::None,
        }
    };
    Ok(InstallResult { success, status })
}

#[tauri::command]
pub async fn binaries_update(name: String) -> AppResult<InstallResult> {
    let n = name_from(&name)?;
    let success = update_binary(n).await;
    let status = if success {
        resolve_binary(n).await
    } else {
        BinaryStatus {
            installed: false,
            version: None,
            path: String::new(),
            source: BinarySource::None,
        }
    };
    Ok(InstallResult { success, status })
}

#[tauri::command]
pub async fn binaries_get_path(name: String) -> AppResult<String> {
    let n = name_from(&name)?;
    Ok(crate::binary::resolver::get_spawn_path(n).await)
}
