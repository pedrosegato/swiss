use crate::error::{AppError, AppResult};
use tauri::{AppHandle, Manager};
use tauri::window::{ProgressBarState, ProgressBarStatus};

fn main_window(app: &AppHandle) -> AppResult<tauri::WebviewWindow> {
    app.get_webview_window("main")
        .ok_or_else(|| AppError::Other("main window missing".into()))
}

#[tauri::command]
pub async fn window_minimize(app: AppHandle) -> AppResult<()> {
    main_window(&app)?
        .minimize()
        .map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
pub async fn window_maximize(app: AppHandle) -> AppResult<()> {
    let win = main_window(&app)?;
    if win
        .is_maximized()
        .map_err(|e| AppError::Other(e.to_string()))?
    {
        win.unmaximize()
            .map_err(|e| AppError::Other(e.to_string()))
    } else {
        win.maximize()
            .map_err(|e| AppError::Other(e.to_string()))
    }
}

#[tauri::command]
pub async fn window_close(app: AppHandle) -> AppResult<()> {
    main_window(&app)?
        .close()
        .map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
pub async fn dock_set_progress(app: AppHandle, progress: f64) -> AppResult<()> {
    let win = main_window(&app)?;
    let clamped = progress.max(-1.0).min(1.0);
    let status = if clamped < 0.0 {
        ProgressBarStatus::None
    } else {
        ProgressBarStatus::Normal
    };
    let progress_u64 = if clamped < 0.0 {
        0
    } else {
        (clamped * 100.0) as u64
    };
    win.set_progress_bar(ProgressBarState {
        status: Some(status),
        progress: Some(progress_u64),
    })
    .map_err(|e| AppError::Other(e.to_string()))
}
