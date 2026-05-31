use std::collections::HashMap;
use std::path::PathBuf;

pub fn binary_suffix(os: &str) -> &'static str {
    if os == "windows" { ".exe" } else { "" }
}

pub fn get_local_bin_dir() -> PathBuf {
    if cfg!(windows) {
        let local_app_data = std::env::var("LOCALAPPDATA")
            .or_else(|_| std::env::var("USERPROFILE").map(|p| format!("{p}\\AppData\\Local")))
            .unwrap_or_default();
        PathBuf::from(local_app_data).join("Programs")
    } else {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/usr/local".into());
        PathBuf::from(home).join(".local").join("bin")
    }
}

pub fn get_local_bin_path(name: &str) -> PathBuf {
    let os = if cfg!(windows) { "windows" } else { "" };
    let mut p = get_local_bin_dir().join(name);
    let suffix = binary_suffix(os);
    if !suffix.is_empty() {
        p.set_extension(&suffix[1..]);
    }
    p
}

pub fn platform_variant<'a>(
    variants: &HashMap<&str, &'a str>,
    os: &str,
    arch: &str,
) -> &'a str {
    let key = match (os, arch) {
        ("macos" | "darwin", "aarch64") => "darwin-arm64",
        ("macos" | "darwin", "x86_64") => "darwin-x64",
        ("windows", "x86_64") => "win32-x64",
        ("linux", "x86_64") => "linux-x64",
        _ => "linux-x64",
    };
    variants.get(key).copied().unwrap_or_else(|| {
        variants.get("linux-x64").copied().unwrap_or("")
    })
}

pub fn current_os() -> &'static str {
    if cfg!(target_os = "macos") { "macos" }
    else if cfg!(target_os = "windows") { "windows" }
    else { "linux" }
}

pub fn current_arch() -> &'static str {
    std::env::consts::ARCH
}

const PYTHON_CANDIDATES: &[&str] = &[
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    "python3",
];

pub async fn find_python() -> String {
    use tokio::process::Command;
    for py in PYTHON_CANDIDATES {
        if Command::new(py).arg("--version").output().await.map(|o| o.status.success()).unwrap_or(false) {
            return (*py).to_string();
        }
    }
    "python3".into()
}

pub async fn get_pip_user_bin_dir(python: &str) -> Option<PathBuf> {
    use tokio::process::Command;
    let out = Command::new(python).args(["-m", "site", "--user-base"]).output().await.ok()?;
    if !out.status.success() { return None; }
    let base = String::from_utf8(out.stdout).ok()?.trim().to_string();
    Some(PathBuf::from(base).join("bin"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn local_bin_path_appends_exe_on_windows() {
        assert_eq!(binary_suffix("windows"), ".exe");
        assert_eq!(binary_suffix("macos"), "");
        assert_eq!(binary_suffix("linux"), "");
    }

    #[test]
    fn platform_variant_returns_correct_url() {
        let mut m: HashMap<&str, &str> = HashMap::new();
        m.insert("darwin-arm64", "darwin-arm64-url");
        m.insert("linux-x64", "linux-x64-url");
        assert_eq!(
            platform_variant(&m, "darwin", "aarch64"),
            "darwin-arm64-url"
        );
        assert_eq!(
            platform_variant(&m, "linux", "x86_64"),
            "linux-x64-url"
        );
        assert_eq!(
            platform_variant(&m, "freebsd", "x86_64"),
            "linux-x64-url"
        );
    }
}
