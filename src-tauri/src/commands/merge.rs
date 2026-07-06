use crate::binary::{resolver::get_spawn_path, BinaryName};
use crate::error::AppResult;
use crate::process_registry::MERGES;
use crate::progress::{MediaKind, ProgressEvent, Stage};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::ipc::Channel;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::watch;
use tokio::sync::Mutex as AsyncMutex;

#[derive(Deserialize, Copy, Clone)]
#[serde(rename_all = "lowercase")]
pub enum MergeDirection {
    Vertical,
    Horizontal,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeOptions {
    pub id: String,
    pub main_path: String,
    pub bg_path: String,
    pub direction: MergeDirection,
    pub save_path: String,
}

static MERGE_QUEUE: Lazy<Arc<AsyncMutex<()>>> = Lazy::new(|| Arc::new(AsyncMutex::new(())));
static OUT_TIME_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"out_time_us=(\d+)").unwrap());
static DISK_FULL_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)no space left|disk full|não há espaço").unwrap());

fn cancelled_event(id: &str) -> ProgressEvent {
    ProgressEvent {
        id: id.to_string(),
        kind: MediaKind::Merge,
        progress: 0,
        stage: Stage::Error,
        error_message: Some("Cancelado".into()),
        output_size: None,
        output_path: None,
    }
}

struct MergeGuard(String);

impl Drop for MergeGuard {
    fn drop(&mut self) {
        MERGES.remove(&self.0);
    }
}

pub fn build_filter_complex(direction: MergeDirection) -> String {
    match direction {
        MergeDirection::Vertical => [
            "[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[v0]",
            "[1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[v1]",
            "[v0][v1]vstack=inputs=2[vout]",
        ]
        .join(";"),
        MergeDirection::Horizontal => [
            "[0:v]scale=540:1080:force_original_aspect_ratio=increase,crop=540:1080,setsar=1[v0]",
            "[1:v]scale=540:1080:force_original_aspect_ratio=increase,crop=540:1080,setsar=1[v1]",
            "[v0][v1]hstack=inputs=2[vout]",
        ]
        .join(";"),
    }
}

pub fn build_output_path(main: &str, save: &str) -> PathBuf {
    let stem = Path::new(main)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let save = PathBuf::from(save);
    let mut out = save.join(format!("{stem}_merged.mp4"));
    let mut counter = 1;
    while out.exists() {
        out = save.join(format!("{stem}_merged_{counter}.mp4"));
        counter += 1;
    }
    out
}

fn encoder_args() -> Vec<String> {
    if cfg!(target_os = "macos") {
        vec!["-c:v", "h264_videotoolbox", "-q:v", "65"]
            .into_iter()
            .map(String::from)
            .collect()
    } else {
        vec!["-c:v", "libx264", "-preset", "ultrafast", "-crf", "18"]
            .into_iter()
            .map(String::from)
            .collect()
    }
}

struct ProbeInfo {
    width: i32,
    duration: f64,
}

async fn probe(path: &str) -> AppResult<ProbeInfo> {
    let ffprobe = get_spawn_path(BinaryName::Ffprobe).await;
    let out = Command::new(&ffprobe)
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            path,
        ])
        .output()
        .await?;
    let v: serde_json::Value = serde_json::from_slice(&out.stdout)?;
    let stream = &v["streams"][0];
    let format = &v["format"];
    Ok(ProbeInfo {
        width: stream["width"].as_i64().unwrap_or(0) as i32,
        duration: format["duration"]
            .as_str()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0),
    })
}

async fn run_ffmpeg(
    ffmpeg: &str,
    args: &[String],
    id: &str,
    duration: f64,
    on_event: &Channel<ProgressEvent>,
    mut cancel: watch::Receiver<bool>,
) -> (i32, String, bool) {
    let mut cmd = Command::new(ffmpeg);
    cmd.args(args)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true);
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return (-1, e.to_string(), false),
    };
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let id_so = id.to_string();
    let on_event_so = on_event.clone();
    let stdout_handle = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => break,
                Ok(_) => {}
                Err(_) => continue,
            }
            if let Some(c) = OUT_TIME_RE.captures(&line) {
                if duration > 0.0 {
                    let current: f64 = c[1].parse::<f64>().unwrap_or(0.0) / 1_000_000.0;
                    let progress = ((current / duration) * 100.0).round() as i32;
                    let _ = on_event_so.send(ProgressEvent {
                        id: id_so.clone(),
                        kind: MediaKind::Merge,
                        progress: progress.min(99),
                        stage: Stage::Merging,
                        error_message: None,
                        output_size: None,
                        output_path: None,
                    });
                }
            }
        }
    });

    let stderr_handle = tokio::spawn(async move {
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
            crate::commands::download::truncate_tail(&mut buf, 65536);
        }
        buf
    });

    let (status, cancelled) = tokio::select! {
        s = child.wait() => (s, false),
        _ = async {
            let _ = cancel.wait_for(|&c| c).await;
        } => {
            let _ = child.start_kill();
            let s = child.wait().await;
            (s, true)
        }
    };
    let _ = stdout_handle.await;
    let buf = stderr_handle.await.unwrap_or_default();
    (
        status.ok().and_then(|s| s.code()).unwrap_or(-1),
        buf,
        cancelled,
    )
}

#[tauri::command]
pub async fn merge_start(
    app: AppHandle,
    options: MergeOptions,
    on_event: Channel<ProgressEvent>,
) -> AppResult<()> {
    let id = options.id.clone();
    let queue = MERGE_QUEUE.clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        let cancel_rx = match MERGES.register(id.clone()) {
            Some(rx) => rx,
            None => {
                let _ = on_event.send(ProgressEvent {
                    id: id.clone(),
                    kind: MediaKind::Merge,
                    progress: 0,
                    stage: Stage::Error,
                    error_message: Some("Job já em andamento".into()),
                    output_size: None,
                    output_path: None,
                });
                return;
            }
        };
        let _guard = MergeGuard(id.clone());
        let (cancel_tx, cancel_watch) = watch::channel(false);
        tokio::spawn(async move {
            if cancel_rx.await.is_ok() {
                let _ = cancel_tx.send(true);
            }
        });

        let _permit = queue.lock().await;
        if *cancel_watch.borrow() {
            let _ = on_event.send(cancelled_event(&id));
            return;
        }

        let main_info = match probe(&options.main_path).await {
            Ok(i) => i,
            Err(e) => {
                let _ = on_event.send(ProgressEvent {
                    id: id.clone(),
                    kind: MediaKind::Merge,
                    progress: 0,
                    stage: Stage::Error,
                    error_message: Some(format!("Erro na mesclagem: {e}")),
                    output_size: None,
                    output_path: None,
                });
                return;
            }
        };
        if *cancel_watch.borrow() {
            let _ = on_event.send(cancelled_event(&id));
            return;
        }
        let bg_info = match probe(&options.bg_path).await {
            Ok(i) => i,
            Err(e) => {
                let _ = on_event.send(ProgressEvent {
                    id: id.clone(),
                    kind: MediaKind::Merge,
                    progress: 0,
                    stage: Stage::Error,
                    error_message: Some(format!("Erro na mesclagem: {e}")),
                    output_size: None,
                    output_path: None,
                });
                return;
            }
        };
        if *cancel_watch.borrow() {
            let _ = on_event.send(cancelled_event(&id));
            return;
        }
        if main_info.width == 0 || bg_info.width == 0 {
            let _ = on_event.send(ProgressEvent {
                id: id.clone(),
                kind: MediaKind::Merge,
                progress: 0,
                stage: Stage::Error,
                error_message: Some("Não foi possível obter dimensões do vídeo".into()),
                output_size: None,
                output_path: None,
            });
            return;
        }

        let ffmpeg = get_spawn_path(BinaryName::Ffmpeg).await;
        let filter_complex = build_filter_complex(options.direction);
        let output_path = build_output_path(&options.main_path, &options.save_path);

        let build_args = |enc: &[String]| -> Vec<String> {
            let mut a: Vec<String> = vec![
                "-i".into(),
                options.main_path.clone(),
                "-stream_loop".into(),
                "-1".into(),
                "-i".into(),
                options.bg_path.clone(),
                "-filter_complex".into(),
                filter_complex.clone(),
                "-map".into(),
                "[vout]".into(),
                "-map".into(),
                "0:a?".into(),
            ];
            a.extend(enc.iter().cloned());
            a.extend(
                ["-c:a", "aac", "-b:a", "192k", "-t"]
                    .iter()
                    .map(|s| s.to_string()),
            );
            a.push(format!("{}", main_info.duration));
            a.extend(["-progress", "pipe:1", "-y"].iter().map(|s| s.to_string()));
            a.push(output_path.to_string_lossy().to_string());
            a
        };

        let enc = encoder_args();
        let mut args = build_args(&enc);
        let mut result = run_ffmpeg(
            &ffmpeg,
            &args,
            &id,
            main_info.duration,
            &on_event,
            cancel_watch.clone(),
        )
        .await;

        if result.0 != 0 && !result.2 && enc.get(1).map(|s| s.as_str()) != Some("libx264") {
            let sw: Vec<String> = vec!["-c:v", "libx264", "-preset", "ultrafast", "-crf", "18"]
                .into_iter()
                .map(String::from)
                .collect();
            args = build_args(&sw);
            result = run_ffmpeg(
                &ffmpeg,
                &args,
                &id,
                main_info.duration,
                &on_event,
                cancel_watch.clone(),
            )
            .await;
        }

        if result.2 {
            let _ = on_event.send(cancelled_event(&id));
            return;
        }

        if result.0 == 0 {
            let output_size = tokio::fs::metadata(&output_path)
                .await
                .ok()
                .map(|m| m.len());
            let _ = app_clone
                .notification()
                .builder()
                .title("Mesclagem concluída")
                .body(
                    output_path
                        .file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default(),
                )
                .show();
            let _ = on_event.send(ProgressEvent {
                id: id.clone(),
                kind: MediaKind::Merge,
                progress: 100,
                stage: Stage::Completed,
                error_message: None,
                output_size,
                output_path: Some(output_path.to_string_lossy().to_string()),
            });
        } else {
            let last_lines: String = result
                .1
                .trim()
                .lines()
                .rev()
                .take(5)
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect::<Vec<_>>()
                .join("\n");
            let err_msg = if last_lines.is_empty() {
                format!("ffmpeg encerrou com código {}", result.0)
            } else {
                last_lines
            };
            let is_disk_full = DISK_FULL_RE.is_match(&err_msg);
            let _ = on_event.send(ProgressEvent {
                id: id.clone(),
                kind: MediaKind::Merge,
                progress: 0,
                stage: Stage::Error,
                error_message: Some(if is_disk_full {
                    "Disco cheio — libere espaço e tente novamente".into()
                } else {
                    err_msg
                }),
                output_size: None,
                output_path: None,
            });
        }
    });
    Ok(())
}

#[tauri::command]
pub async fn merge_cancel(id: String) -> AppResult<()> {
    MERGES.cancel(&id);
    Ok(())
}

#[tauri::command]
pub async fn merge_thumbnail(app: AppHandle, file_path: String) -> AppResult<Option<String>> {
    crate::commands::convert::convert_thumbnail(app, file_path).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vertical_filter_uses_vstack() {
        let s = build_filter_complex(MergeDirection::Vertical);
        assert!(s.contains("vstack=inputs=2"));
        assert!(s.contains("scale=1080:960"));
    }

    #[test]
    fn horizontal_filter_uses_hstack() {
        let s = build_filter_complex(MergeDirection::Horizontal);
        assert!(s.contains("hstack=inputs=2"));
        assert!(s.contains("scale=540:1080"));
    }

    #[test]
    fn cancelled_event_reports_cancellation() {
        let json = serde_json::to_string(&cancelled_event("job-1")).unwrap();
        assert!(json.contains(r#""id":"job-1""#));
        assert!(json.contains(r#""type":"merge""#));
        assert!(json.contains(r#""stage":"error""#));
        assert!(json.contains(r#""errorMessage":"Cancelado""#));
    }
}
