pub fn augment_path() {
    let current = std::env::var("PATH").unwrap_or_default();
    let extra: Vec<String> = if cfg!(windows) {
        let local = std::env::var("LOCALAPPDATA")
            .or_else(|_| std::env::var("USERPROFILE").map(|p| format!("{p}\\AppData\\Local")))
            .unwrap_or_default();
        vec![format!("{local}\\Programs")]
    } else {
        let home = std::env::var("HOME").unwrap_or_default();
        vec![
            "/usr/local/bin".into(),
            "/opt/homebrew/bin".into(),
            "/opt/homebrew/sbin".into(),
            format!("{home}/.local/bin"),
        ]
    };
    let sep = if cfg!(windows) { ";" } else { ":" };
    let prefix = extra.join(sep);
    let merged = if cfg!(windows) {
        format!("{prefix}{sep}{current}")
    } else {
        format!("{current}{sep}{prefix}")
    };
    std::env::set_var("PATH", merged);
}
