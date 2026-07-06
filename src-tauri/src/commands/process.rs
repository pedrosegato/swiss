use once_cell::sync::Lazy;
use regex::Regex;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, ChildStderr, Command};
use tokio::task::JoinHandle;

pub(crate) static OUT_TIME_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"out_time_us=(\d+)").unwrap());
pub(crate) static DISK_FULL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)no space left|disk full|não há espaço").unwrap());
pub(crate) static BITRATE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(\d+)").unwrap());

pub(crate) fn truncate_tail(buf: &mut String, max: usize) {
    if buf.len() > max {
        let mut cut = buf.len() - max;
        while cut < buf.len() && !buf.is_char_boundary(cut) {
            cut += 1;
        }
        buf.drain(..cut);
    }
}

pub(crate) fn spawn_piped(command: &str, args: &[String]) -> std::io::Result<Child> {
    Command::new(command)
        .args(args)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true)
        .spawn()
}

pub(crate) fn drain_stderr(stderr: ChildStderr) -> JoinHandle<String> {
    tokio::spawn(async move {
        let mut buf = String::new();
        let mut reader = BufReader::new(stderr);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => break,
                Ok(_) => {}
                Err(_) => continue,
            }
            buf.push_str(&line);
            truncate_tail(&mut buf, 65536);
        }
        buf
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn truncate_tail_never_splits_multibyte() {
        let mut s = String::new();
        while s.len() < 70000 {
            s.push('ç');
        }
        truncate_tail(&mut s, 65536);
        assert!(s.len() <= 70000);
        assert!(std::str::from_utf8(s.as_bytes()).is_ok());
    }

    #[test]
    fn out_time_regex_captures_microseconds() {
        let c = OUT_TIME_RE.captures("out_time_us=1500000").unwrap();
        assert_eq!(&c[1], "1500000");
    }

    #[test]
    fn disk_full_regex_matches_variants() {
        assert!(DISK_FULL_RE.is_match("No space left on device"));
        assert!(DISK_FULL_RE.is_match("disk full"));
        assert!(DISK_FULL_RE.is_match("não há espaço"));
        assert!(!DISK_FULL_RE.is_match("permission denied"));
    }

    #[test]
    fn bitrate_regex_extracts_first_number() {
        let c = BITRATE_RE.captures("192 kbps").unwrap();
        assert_eq!(&c[1], "192");
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn run_streams_stdout_and_stderr() {
        let mut child = spawn_piped(
            "sh",
            &[
                "-c".into(),
                "printf 'a\\nb\\n'; printf 'err' 1>&2".into(),
            ],
        )
        .expect("spawn");
        let stdout = child.stdout.take().unwrap();
        let stderr_handle = drain_stderr(child.stderr.take().unwrap());

        let stdout_handle = tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            let mut lines = Vec::new();
            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => break,
                    Ok(_) => {}
                    Err(_) => continue,
                }
                lines.push(line.trim().to_string());
            }
            lines
        });

        let status = child.wait().await.unwrap();
        let stderr_buf = stderr_handle.await.unwrap();
        let lines = stdout_handle.await.unwrap();

        assert_eq!(status.code(), Some(0));
        assert_eq!(stderr_buf, "err");
        assert_eq!(lines, vec!["a", "b"]);
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn cancel_kills_child_and_reports_cancelled() {
        let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel::<()>();
        let mut child = spawn_piped("sh", &["-c".into(), "sleep 30".into()]).expect("spawn");

        tokio::spawn(async move {
            let _ = cancel_tx.send(());
        });

        let (status, cancelled) = tokio::select! {
            s = child.wait() => (s, false),
            _ = cancel_rx => {
                let _ = child.start_kill();
                let s = child.wait().await;
                (s, true)
            }
        };

        assert!(cancelled);
        assert_ne!(status.ok().and_then(|s| s.code()), Some(0));
    }
}
