use crate::binary::{
    resolver::{get_spawn_path, get_ytdlp_spawn_info},
    BinaryName,
};
use crate::commands::process::{spawn_piped, truncate_tail, DISK_FULL_RE};
use crate::error::AppResult;
use crate::format::{build_format_string, format_duration};
use crate::process_registry::DOWNLOADS;
use crate::progress::{DownloadEvent, MediaKind, Stage};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadOptions {
    pub id: String,
    pub url: String,
    pub format: String,
    pub quality: String,
    pub save_path: String,
    pub cookie_browser: Option<String>,
}

#[derive(Default)]
struct PlaylistState {
    total: i32,
    index: i32,
    filesize: f64,
}

pub static PERCENT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(\d+\.?\d*)%").unwrap());
static PLAYLIST_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[?&]list=|/playlist\?|/sets/").unwrap());
static MERGER_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"\[Merger\] Merging formats into "(.+?)""#).unwrap());
static DEST_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\[download\] Destination: (.+)").unwrap());
static CONVERT_STAGE_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\[Merger\]|\[ExtractAudio\]|\[FFmpegVideoConvertor\]|\[FixupM3u8\]").unwrap()
});

pub fn is_playlist_url(url: &str) -> bool {
    PLAYLIST_RE.is_match(url)
}

pub fn classify_resolution(height: i32, res_str: &str) -> Option<String> {
    if height >= 2160 {
        return Some("4K".into());
    }
    if height >= 1440 {
        return Some("1440p".into());
    }
    if height > 0 {
        return Some(format!("{height}p"));
    }
    let trimmed = res_str.trim();
    if trimmed.is_empty() || trimmed == "NA" || trimmed == "audio only" {
        return None;
    }
    let parts: Vec<&str> = trimmed.split('x').collect();
    let h: i32 = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
    if h >= 2160 {
        Some("4K".into())
    } else if h >= 1440 {
        Some("1440p".into())
    } else if h > 0 {
        Some(format!("{h}p"))
    } else {
        None
    }
}

pub fn extract_merger_path(stderr: &str) -> Option<String> {
    MERGER_RE.captures(stderr).map(|c| c[1].to_string())
}

fn is_success(code: i32, metadata_sent: bool, playlist_total: i32) -> bool {
    code == 0 || (metadata_sent && playlist_total > 0)
}

#[tauri::command]
pub async fn download_start(
    options: DownloadOptions,
    on_event: Channel<DownloadEvent>,
) -> AppResult<()> {
    let id = options.id.clone();
    let ytdlp = get_ytdlp_spawn_info().await;
    let ffmpeg_path = get_spawn_path(BinaryName::Ffmpeg).await;
    let ffmpeg_dir = Path::new(&ffmpeg_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let sep = "<<|>>";
    let print_tpl = format!(
        "%(id)s{0}%(title)s{0}%(duration)s{0}%(thumbnail)s{0}%(filesize_approx)s{0}%(height)s{0}%(resolution)s{0}%(playlist_title)s{0}%(n_entries)s{0}%(playlist_index)s",
        sep
    );

    let video_formats = ["mp4", "mkv", "webm"];
    let is_video = video_formats.contains(&options.format.as_str());
    let is_playlist = is_playlist_url(&options.url);
    let output_tpl = if is_playlist {
        format!(
            "{}/%(playlist_title)s/%(title)s_%(id)s.%(ext)s",
            options.save_path
        )
    } else {
        format!("{}/%(title)s_%(id)s.%(ext)s", options.save_path)
    };

    let mut args: Vec<String> = vec![
        "-f".into(),
        build_format_string(&options.format, &options.quality),
        "-o".into(),
        output_tpl,
        "--newline".into(),
        "--progress".into(),
        "--print".into(),
        print_tpl.clone(),
        "--no-simulate".into(),
        "--ffmpeg-location".into(),
        ffmpeg_dir,
        "--remote-components".into(),
        "ejs:github".into(),
        "--ignore-errors".into(),
    ];
    if is_video {
        args.extend(["--merge-output-format".into(), options.format.clone()]);
    } else {
        args.extend(["-x".into(), "--audio-format".into(), options.format.clone()]);
    }
    if is_video && options.format == "mp4" {
        args.extend([
            "--postprocessor-args".into(),
            "ffmpeg:-c:v libx264 -preset ultrafast -crf 18 -c:a aac -b:a 192k".into(),
        ]);
    }
    if cfg!(windows) {
        args.extend(["--encoding".into(), "utf-8".into()]);
    }
    if let Some(cb) = &options.cookie_browser {
        args.extend(["--cookies-from-browser".into(), cb.clone()]);
    }
    args.push(options.url.clone());

    let mut all_args: Vec<String> = ytdlp.prefix_args.clone();
    all_args.extend(args);

    let mut child = spawn_piped(&ytdlp.command, &all_args)?;
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let cancel_rx = match DOWNLOADS.register(id.clone()) {
        Some(rx) => rx,
        None => {
            let _ = on_event.send(DownloadEvent::Progress {
                id: id.clone(),
                kind: MediaKind::Download,
                progress: 0,
                stage: Stage::Error,
                error_message: Some("Job já em andamento".into()),
                output_path: None,
                playlist_downloaded: None,
                playlist_file_size: None,
            });
            return Ok(());
        }
    };

    let state = Arc::new(Mutex::new(PlaylistState::default()));

    let id_for_stderr = id.clone();
    let on_event_stderr = on_event.clone();
    let state_stderr = state.clone();
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
            truncate_tail(&mut buf, 65536);
            if CONVERT_STAGE_RE.is_match(&line) {
                let (total, index, filesize) = {
                    let s = state_stderr.lock().unwrap();
                    (s.total, s.index, s.filesize)
                };
                let progress = if total > 0 {
                    ((index as f64 / total as f64) * 100.0).round() as i32
                } else {
                    100
                };
                let _ = on_event_stderr.send(DownloadEvent::Progress {
                    id: id_for_stderr.clone(),
                    kind: MediaKind::Download,
                    progress: progress.min(99),
                    stage: Stage::Converting,
                    error_message: None,
                    output_path: None,
                    playlist_downloaded: if total > 0 { Some(index as u32) } else { None },
                    playlist_file_size: if total > 0 { Some(filesize) } else { None },
                });
            }
        }
        buf
    });

    let id_for_stdout = id.clone();
    let on_event_stdout = on_event.clone();
    let state_stdout = state.clone();
    let stdout_handle = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        let mut metadata_sent = false;
        let mut last_title = String::new();
        let mut last_video_id = String::new();

        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => break,
                Ok(_) => {}
                Err(_) => continue,
            }
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            if trimmed.contains(sep) {
                let parts: Vec<&str> = trimmed.split(sep).collect();
                if parts.len() >= 6 {
                    let video_id = parts[0].to_string();
                    let title = if parts[1].is_empty() {
                        "Unknown".to_string()
                    } else {
                        parts[1].to_string()
                    };
                    last_title = title.clone();
                    last_video_id = video_id.clone();
                    let duration: f64 = parts[2].parse().unwrap_or(0.0);
                    let thumbnail = parts[3].to_string();
                    let filesize: f64 = parts[4].parse().unwrap_or(0.0);
                    let height: i32 = parts[5].parse().unwrap_or(0);
                    let res_str = parts.get(6).map(|s| s.trim()).unwrap_or("");
                    let resolution = classify_resolution(height, res_str);
                    let playlist_title = parts.get(7).map(|s| s.trim()).unwrap_or("");
                    let n_entries: i32 = parts.get(8).and_then(|s| s.parse().ok()).unwrap_or(0);
                    let pl_index: i32 = parts.get(9).and_then(|s| s.parse().ok()).unwrap_or(0);
                    if n_entries > 0 {
                        let mut s = state_stdout.lock().unwrap();
                        s.total = n_entries;
                        s.index = pl_index;
                        s.filesize += filesize;
                    }
                    if !metadata_sent {
                        metadata_sent = true;
                        let _ = on_event_stdout.send(DownloadEvent::Metadata {
                            id: id_for_stdout.clone(),
                            video_id,
                            title,
                            duration: format_duration(duration),
                            thumbnail,
                            filesize,
                            resolution,
                            playlist_title: if !playlist_title.is_empty() && playlist_title != "NA"
                            {
                                Some(playlist_title.into())
                            } else {
                                None
                            },
                            playlist_count: if n_entries > 0 {
                                Some(n_entries as u32)
                            } else {
                                None
                            },
                        });
                    }
                }
            }

            if let Some(c) = PERCENT_RE.captures(trimmed) {
                let video_progress: f64 = c[1].parse().unwrap_or(0.0);
                let (total, index, filesize) = {
                    let s = state_stdout.lock().unwrap();
                    (s.total, s.index, s.filesize)
                };
                let progress = if total > 0 {
                    ((index.saturating_sub(1) as f64 + video_progress / 100.0) / total as f64
                        * 100.0)
                        .round() as i32
                } else {
                    video_progress.round() as i32
                };
                let _ = on_event_stdout.send(DownloadEvent::Progress {
                    id: id_for_stdout.clone(),
                    kind: MediaKind::Download,
                    progress,
                    stage: Stage::Downloading,
                    error_message: None,
                    output_path: None,
                    playlist_downloaded: if total > 0 {
                        Some(index.saturating_sub(1) as u32)
                    } else {
                        None
                    },
                    playlist_file_size: if total > 0 { Some(filesize) } else { None },
                });
            }
        }
        (metadata_sent, last_title, last_video_id)
    });

    let id_for_close = id.clone();
    let on_event_close = on_event.clone();
    let state_close = state.clone();
    tokio::spawn(async move {
        let (status, cancelled) = tokio::select! {
            s = child.wait() => (s, false),
            _ = cancel_rx => {
                let _ = child.start_kill();
                let s = child.wait().await;
                (s, true)
            }
        };
        DOWNLOADS.remove(&id_for_close);
        let stderr_buf = stderr_handle.await.unwrap_or_default();
        let (metadata_sent, last_title, last_video_id) =
            stdout_handle
                .await
                .unwrap_or((false, String::new(), String::new()));

        if cancelled {
            let _ = on_event_close.send(DownloadEvent::Progress {
                id: id_for_close,
                kind: MediaKind::Download,
                progress: 0,
                stage: Stage::Error,
                error_message: Some("Cancelado".into()),
                output_path: None,
                playlist_downloaded: None,
                playlist_file_size: None,
            });
            return;
        }

        let playlist_total = state_close.lock().unwrap().total;
        let code = status.ok().and_then(|s| s.code()).unwrap_or(-1);

        if is_success(code, metadata_sent, playlist_total) {
            let output_path: Option<String> = if playlist_total > 0 {
                DEST_RE.captures_iter(&stderr_buf).next().and_then(|c| {
                    Path::new(c[1].trim())
                        .parent()
                        .map(|p| p.to_string_lossy().to_string())
                })
            } else {
                extract_merger_path(&stderr_buf)
                    .or_else(|| {
                        DEST_RE
                            .captures_iter(&stderr_buf)
                            .last()
                            .map(|c| c[1].trim().to_string())
                    })
                    .or_else(|| {
                        if metadata_sent {
                            let guessed = format!(
                                "{}/{}_{}.{}",
                                options.save_path, last_title, last_video_id, options.format
                            );
                            if Path::new(&guessed).exists() {
                                Some(guessed)
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    })
            };
            let _ = on_event_close.send(DownloadEvent::Progress {
                id: id_for_close,
                kind: MediaKind::Download,
                progress: 100,
                stage: Stage::Completed,
                error_message: None,
                output_path,
                playlist_downloaded: None,
                playlist_file_size: None,
            });
        } else {
            let err_msg = if stderr_buf.trim().is_empty() {
                format!("Processo encerrou com código {code}")
            } else {
                stderr_buf.trim().to_string()
            };
            let is_disk_full = DISK_FULL_RE.is_match(&err_msg);
            let _ = on_event_close.send(DownloadEvent::Progress {
                id: id_for_close,
                kind: MediaKind::Download,
                progress: 0,
                stage: Stage::Error,
                error_message: Some(if is_disk_full {
                    "Disco cheio, libere espaço e tente novamente".into()
                } else {
                    err_msg
                }),
                output_path: None,
                playlist_downloaded: None,
                playlist_file_size: None,
            });
        }
    });
    Ok(())
}

#[tauri::command]
pub async fn download_cancel(id: String) -> AppResult<()> {
    DOWNLOADS.cancel(&id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percent_regex_matches() {
        let line = "[download]  42.5% of 100MiB at 5.0MiB/s ETA 00:10";
        let m = PERCENT_RE.captures(line).unwrap();
        assert_eq!(&m[1], "42.5");
    }

    #[test]
    fn resolution_classifies_heights() {
        assert_eq!(classify_resolution(0, ""), None);
        assert_eq!(classify_resolution(2160, ""), Some("4K".into()));
        assert_eq!(classify_resolution(1440, ""), Some("1440p".into()));
        assert_eq!(classify_resolution(720, ""), Some("720p".into()));
        assert_eq!(classify_resolution(0, "1920x1080"), Some("1080p".into()));
        assert_eq!(classify_resolution(0, "audio only"), None);
    }

    #[test]
    fn playlist_detection_url() {
        assert!(is_playlist_url("https://youtube.com/playlist?list=PLabc"));
        assert!(is_playlist_url("https://youtube.com/watch?v=x&list=PLabc"));
        assert!(is_playlist_url("https://soundcloud.com/user/sets/foo"));
        assert!(!is_playlist_url("https://youtube.com/watch?v=x"));
    }

    #[test]
    fn extract_merger_output_path() {
        let stderr = r#"[Merger] Merging formats into "/Users/x/video.mp4""#;
        assert_eq!(
            extract_merger_path(stderr),
            Some("/Users/x/video.mp4".into())
        );
    }

    #[test]
    fn single_video_failure_is_not_success() {
        assert!(!is_success(1, true, 0));
        assert!(!is_success(-1, true, 0));
        assert!(!is_success(1, false, 0));
    }

    #[test]
    fn clean_exit_is_success() {
        assert!(is_success(0, true, 0));
        assert!(is_success(0, false, 5));
    }

    #[test]
    fn playlist_partial_failure_is_success() {
        assert!(is_success(1, true, 10));
    }
}
