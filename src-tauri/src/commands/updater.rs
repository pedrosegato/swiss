use crate::error::AppResult;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize, Clone)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum UpdaterStatus {
    Available { version: String },
    Downloading { percent: u32 },
    Ready { version: String },
    Error { message: String },
}

pub async fn run_auto_update(app: AppHandle) {
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            let _ = app.emit(
                "updater:status",
                UpdaterStatus::Error {
                    message: e.to_string(),
                },
            );
            return;
        }
    };
    let update = match updater.check().await {
        Ok(Some(u)) => u,
        Ok(None) => return,
        Err(e) => {
            let _ = app.emit(
                "updater:status",
                UpdaterStatus::Error {
                    message: e.to_string(),
                },
            );
            return;
        }
    };
    let version = update.version.clone();
    let _ = app.emit(
        "updater:status",
        UpdaterStatus::Available {
            version: version.clone(),
        },
    );

    let mut downloaded: u64 = 0;
    let app_dl = app.clone();
    let download_result = update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded += chunk_length as u64;
                if let Some(total) = content_length {
                    let percent = ((downloaded * 100) / total) as u32;
                    let _ = app_dl.emit("updater:status", UpdaterStatus::Downloading { percent });
                }
            },
            || {},
        )
        .await;

    match download_result {
        Ok(_) => {
            let _ = app.emit("updater:status", UpdaterStatus::Ready { version });
        }
        Err(e) => {
            let _ = app.emit(
                "updater:status",
                UpdaterStatus::Error {
                    message: e.to_string(),
                },
            );
        }
    }
}

#[tauri::command]
pub async fn updater_install(app: AppHandle) -> AppResult<()> {
    app.restart()
}
