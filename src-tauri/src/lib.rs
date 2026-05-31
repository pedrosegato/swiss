pub mod binary;
pub mod commands;
pub mod error;
pub mod format;
pub mod platform;
pub mod process_registry;
pub mod progress;
pub mod setup;

use std::time::Duration;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    crate::setup::augment_path();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,swiss_lib=debug".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                if win.is_minimized().unwrap_or(false) {
                    let _ = win.unminimize();
                }
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let menu = tauri::menu::Menu::default(app.handle())?;
                app.set_menu(menu)?;
            }
            #[cfg(not(target_os = "macos"))]
            {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_decorations(false);
                }
            }
            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    crate::commands::updater::run_auto_update(handle.clone()).await;
                    loop {
                        tokio::time::sleep(Duration::from_secs(30 * 60)).await;
                        crate::commands::updater::run_auto_update(handle.clone()).await;
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::binaries::binaries_check,
            commands::binaries::binaries_install,
            commands::binaries::binaries_uninstall,
            commands::binaries::binaries_update,
            commands::binaries::binaries_get_path,
            commands::dialog::dialog_select_folder,
            commands::dialog::dialog_select_files,
            commands::dialog::fs_check_paths,
            commands::dialog::app_get_downloads_path,
            commands::shell::shell_open_external,
            commands::shell::shell_show_item_in_folder,
            commands::shell::shell_open_path,
            commands::window::window_minimize,
            commands::window::window_maximize,
            commands::window::window_close,
            commands::window::dock_set_progress,
            commands::download::download_start,
            commands::download::download_cancel,
            commands::convert::convert_start,
            commands::convert::convert_cancel,
            commands::convert::convert_thumbnail,
            commands::merge::merge_start,
            commands::merge::merge_cancel,
            commands::merge::merge_thumbnail,
            commands::updater::updater_install,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                crate::process_registry::DOWNLOADS.cancel_all();
                crate::process_registry::CONVERSIONS.cancel_all();
                crate::process_registry::MERGES.cancel_all();
            }
        });
}
