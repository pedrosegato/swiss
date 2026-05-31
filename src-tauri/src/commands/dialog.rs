use crate::error::{AppError, AppResult};
use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};
use tokio::fs;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedFile {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub ext: String,
}

#[tauri::command]
pub async fn dialog_select_folder(app: AppHandle) -> AppResult<Option<String>> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path.map(|p| match p {
            FilePath::Path(p) => p.to_string_lossy().to_string(),
            FilePath::Url(u) => u.to_string(),
        }));
    });
    Ok(rx.await.ok().flatten())
}

#[tauri::command]
pub async fn dialog_select_files(
    app: AppHandle,
    extensions: Vec<String>,
) -> AppResult<Option<Vec<SelectedFile>>> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let ext_refs: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
    app.dialog()
        .file()
        .add_filter("Media", &ext_refs)
        .pick_files(move |paths| {
            let _ = tx.send(paths);
        });
    let paths = match rx.await.ok().flatten() {
        Some(v) => v,
        None => return Ok(None),
    };
    let mut out = Vec::with_capacity(paths.len());
    for p in paths {
        let path_buf = match p {
            FilePath::Path(p) => p,
            FilePath::Url(_) => continue,
        };
        let meta = fs::metadata(&path_buf).await?;
        out.push(SelectedFile {
            path: path_buf.to_string_lossy().to_string(),
            name: path_buf
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default(),
            size: meta.len(),
            ext: path_buf
                .extension()
                .map(|s| s.to_string_lossy().to_lowercase())
                .unwrap_or_default(),
        });
    }
    Ok(Some(out))
}

#[derive(serde::Deserialize)]
pub struct PathEntry {
    pub id: String,
    pub path: String,
}

#[tauri::command]
pub async fn fs_check_paths(paths: Vec<PathEntry>) -> AppResult<Vec<String>> {
    let mut missing = Vec::new();
    for p in paths {
        if tokio::fs::metadata(&p.path).await.is_err() {
            missing.push(p.id);
        }
    }
    Ok(missing)
}

#[tauri::command]
pub async fn app_get_downloads_path(app: AppHandle) -> AppResult<String> {
    let p = app
        .path()
        .download_dir()
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(p.to_string_lossy().to_string())
}
