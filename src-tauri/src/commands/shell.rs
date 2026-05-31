use crate::error::{AppError, AppResult};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use url::Url;

#[tauri::command]
pub async fn shell_open_external(app: AppHandle, url: String) -> AppResult<()> {
    let parsed = Url::parse(&url).map_err(|e| AppError::Other(e.to_string()))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Ok(());
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(())
}

fn expand_tilde(p: &str) -> String {
    if let Some(rest) = p.strip_prefix('~') {
        if let Some(home) = dirs::home_dir() {
            return format!("{}{}", home.to_string_lossy(), rest);
        }
    }
    p.to_string()
}

#[tauri::command]
pub async fn shell_show_item_in_folder(app: AppHandle, file_path: String) -> AppResult<()> {
    let resolved = expand_tilde(&file_path);
    app.opener()
        .reveal_item_in_dir(&resolved)
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn shell_open_path(app: AppHandle, dir_path: String) -> AppResult<()> {
    let resolved = expand_tilde(&dir_path);
    app.opener()
        .open_path(resolved, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(())
}
