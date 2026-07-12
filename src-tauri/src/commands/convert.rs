use crate::binary::{resolver::get_spawn_path, BinaryName};
use crate::commands::process::{drain_stderr, spawn_piped, BITRATE_RE, DISK_FULL_RE, OUT_TIME_RE};
use crate::error::AppResult;
use crate::process_registry::CONVERSIONS;
use crate::progress::{MediaKind, ProgressEvent, Stage};
use base64::{engine::general_purpose::STANDARD, Engine};
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Semaphore;

static CONVERT_SEMAPHORE: Lazy<Arc<Semaphore>> = Lazy::new(|| {
    let n = std::thread::available_parallelism()
        .map(|c| c.get())
        .unwrap_or(2)
        .clamp(1, 4);
    Arc::new(Semaphore::new(n))
});

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertOptions {
    pub id: String,
    pub input_path: String,
    pub output_format: String,
    pub quality: String,
    pub save_path: String,
}

pub fn quality_args(format: &str, quality: &str, input_ext: &str) -> Vec<String> {
    let video_formats = ["mp4", "mkv", "avi", "webm", "mov"];
    if video_formats.contains(&format) {
        if quality == "Original" && input_ext == format {
            return vec!["-c".into(), "copy".into()];
        }
        let mut args = Vec::new();
        if format == "webm" {
            args.extend(
                ["-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0"]
                    .iter()
                    .map(|s| s.to_string()),
            );
        } else {
            args.extend(
                ["-c:v", "libx264", "-crf", "23", "-preset", "ultrafast"]
                    .iter()
                    .map(|s| s.to_string()),
            );
        }
        if format == "webm" {
            args.extend(
                ["-c:a", "libopus", "-b:a", "128k"]
                    .iter()
                    .map(|s| s.to_string()),
            );
        } else {
            args.extend(
                ["-c:a", "aac", "-b:a", "192k"]
                    .iter()
                    .map(|s| s.to_string()),
            );
        }
        if quality != "Original" {
            let h = quality.replace('p', "");
            args.push("-vf".into());
            args.push(format!("scale=-2:{h}"));
        }
        return args;
    }
    let bitrate = BITRATE_RE
        .captures(quality)
        .map(|c| c[1].to_string())
        .unwrap_or_else(|| "192".into());
    vec!["-b:a".into(), format!("{bitrate}k"), "-vn".into()]
}

pub fn build_output_path(input_path: &str, output_format: &str, save_path: &str) -> PathBuf {
    let dir: PathBuf = if save_path == "same" {
        Path::new(input_path)
            .parent()
            .unwrap_or(Path::new("."))
            .to_path_buf()
    } else {
        let home = dirs::home_dir()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_default();
        PathBuf::from(save_path.replacen('~', &home, 1))
    };
    let stem = Path::new(input_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let mut out = dir.join(format!("{stem}.{output_format}"));
    let mut counter = 1;
    while out.exists() {
        out = dir.join(format!("{stem}_{counter}.{output_format}"));
        counter += 1;
    }
    out
}

async fn media_duration(path: &str) -> f64 {
    let ffprobe = get_spawn_path(BinaryName::Ffprobe).await;
    let out = match Command::new(&ffprobe)
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            path,
        ])
        .output()
        .await
    {
        Ok(o) => o,
        Err(_) => return 0.0,
    };
    String::from_utf8_lossy(&out.stdout)
        .trim()
        .parse()
        .unwrap_or(0.0)
}

#[tauri::command]
pub async fn convert_start(
    app: AppHandle,
    options: ConvertOptions,
    on_event: Channel<ProgressEvent>,
) -> AppResult<()> {
    let id = options.id.clone();

    tokio::spawn(async move {
        let mut cancel_rx = match CONVERSIONS.register(id.clone()) {
            Some(rx) => rx,
            None => {
                let _ = on_event.send(ProgressEvent {
                    id: id.clone(),
                    kind: MediaKind::Convert,
                    progress: 0,
                    stage: Stage::Error,
                    error_message: Some("Job já em andamento".into()),
                    output_size: None,
                    output_path: None,
                });
                return;
            }
        };

        let _permit = tokio::select! {
            p = CONVERT_SEMAPHORE.clone().acquire_owned() => match p {
                Ok(p) => p,
                Err(_) => {
                    CONVERSIONS.remove(&id);
                    return;
                }
            },
            _ = &mut cancel_rx => {
                CONVERSIONS.remove(&id);
                let _ = on_event.send(ProgressEvent {
                    id: id.clone(),
                    kind: MediaKind::Convert,
                    progress: 0,
                    stage: Stage::Error,
                    error_message: Some("Cancelado".into()),
                    output_size: None,
                    output_path: None,
                });
                return;
            }
        };

        let ffmpeg = get_spawn_path(BinaryName::Ffmpeg).await;
        let duration = media_duration(&options.input_path).await;
        let output_path = build_output_path(
            &options.input_path,
            &options.output_format,
            &options.save_path,
        );
        let input_ext = Path::new(&options.input_path)
            .extension()
            .map(|s| s.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        let qargs = quality_args(&options.output_format, &options.quality, &input_ext);

        let mut args: Vec<String> = vec!["-i".into(), options.input_path.clone(), "-y".into()];
        args.extend(qargs);
        args.extend(["-progress".into(), "pipe:1".into()]);
        args.push(output_path.to_string_lossy().to_string());

        let mut child = match spawn_piped(&ffmpeg, &args) {
            Ok(c) => c,
            Err(e) => {
                CONVERSIONS.remove(&id);
                let _ = on_event.send(ProgressEvent {
                    id: id.clone(),
                    kind: MediaKind::Convert,
                    progress: 0,
                    stage: Stage::Error,
                    error_message: Some(e.to_string()),
                    output_size: None,
                    output_path: None,
                });
                return;
            }
        };
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        let stderr_handle = drain_stderr(stderr);

        let id_stdout = id.clone();
        let on_event_stdout = on_event.clone();
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
                        let _ = on_event_stdout.send(ProgressEvent {
                            id: id_stdout.clone(),
                            kind: MediaKind::Convert,
                            progress: progress.min(99),
                            stage: Stage::Converting,
                            error_message: None,
                            output_size: None,
                            output_path: None,
                        });
                    }
                }
            }
        });

        let id_close = id.clone();
        let out_path_close = output_path.clone();
        let (status, cancelled) = tokio::select! {
            s = child.wait() => (s, false),
            _ = cancel_rx => {
                let _ = child.start_kill();
                let s = child.wait().await;
                (s, true)
            }
        };
        CONVERSIONS.remove(&id_close);
        let stderr_buf = stderr_handle.await.unwrap_or_default();
        let _ = stdout_handle.await;

        if cancelled {
            let _ = on_event.send(ProgressEvent {
                id: id_close,
                kind: MediaKind::Convert,
                progress: 0,
                stage: Stage::Error,
                error_message: Some("Cancelado".into()),
                output_size: None,
                output_path: None,
            });
            return;
        }

        let code = status.ok().and_then(|s| s.code()).unwrap_or(-1);

        if code == 0 {
            let output_size = tokio::fs::metadata(&out_path_close)
                .await
                .ok()
                .map(|m| m.len());
            let _ = app
                .notification()
                .builder()
                .title("Conversão concluída")
                .body(
                    out_path_close
                        .file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default(),
                )
                .show();
            let _ = on_event.send(ProgressEvent {
                id: id_close,
                kind: MediaKind::Convert,
                progress: 100,
                stage: Stage::Completed,
                error_message: None,
                output_size,
                output_path: Some(out_path_close.to_string_lossy().to_string()),
            });
        } else {
            let err_msg = if stderr_buf.trim().is_empty() {
                format!("ffmpeg encerrou com código {code}")
            } else {
                stderr_buf.trim().to_string()
            };
            let is_disk_full = DISK_FULL_RE.is_match(&err_msg);
            let _ = on_event.send(ProgressEvent {
                id: id_close,
                kind: MediaKind::Convert,
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
pub async fn convert_cancel(id: String) -> AppResult<()> {
    CONVERSIONS.cancel(&id);
    Ok(())
}

#[tauri::command]
pub async fn convert_thumbnail(app: AppHandle, file_path: String) -> AppResult<Option<String>> {
    let ffmpeg = get_spawn_path(BinaryName::Ffmpeg).await;
    let tmp_dir = app
        .path()
        .temp_dir()
        .map_err(|e| crate::error::AppError::Other(e.to_string()))?;
    let tmp_path = tmp_dir.join(format!("swiss-thumb-{}.jpg", uuid::Uuid::new_v4()));
    let out = Command::new(&ffmpeg)
        .args([
            "-i",
            &file_path,
            "-ss",
            "00:00:01",
            "-vframes",
            "1",
            "-vf",
            "scale=384:-2",
            "-q:v",
            "2",
            "-y",
        ])
        .arg(&tmp_path)
        .output()
        .await;
    if !out.map(|o| o.status.success()).unwrap_or(false) {
        return Ok(None);
    }
    let bytes = tokio::fs::read(&tmp_path).await.ok();
    let _ = tokio::fs::remove_file(&tmp_path).await;
    Ok(bytes.map(|b| format!("data:image/jpeg;base64,{}", STANDARD.encode(b))))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn remux_when_same_format_and_original_quality() {
        let a = quality_args("mp4", "Original", "mp4");
        assert_eq!(a, vec!["-c", "copy"]);
    }

    #[test]
    fn h264_encoding_when_not_remux() {
        let a = quality_args("mp4", "720p", "mkv");
        assert!(a.iter().any(|s| s == "libx264"));
        assert!(a.iter().any(|s| s == "scale=-2:720"));
    }

    #[test]
    fn webm_uses_vp9_and_opus() {
        let a = quality_args("webm", "Original", "mp4");
        assert!(a.iter().any(|s| s == "libvpx-vp9"));
        assert!(a.iter().any(|s| s == "libopus"));
    }

    #[test]
    fn audio_uses_bitrate() {
        let a = quality_args("mp3", "192 kbps", "mp4");
        assert_eq!(a, vec!["-b:a", "192k", "-vn"]);
    }
}
