pub mod binary;
pub mod commands;
pub mod error;
pub mod format;
pub mod platform;
pub mod process_registry;
pub mod progress;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,swiss_lib=debug".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
