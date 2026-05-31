use serde::Serialize;

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaKind {
    Download,
    Convert,
    Merge,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Stage {
    Downloading,
    Converting,
    Merging,
    Completed,
    Error,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", rename_all_fields = "camelCase", tag = "event", content = "data")]
pub enum DownloadEvent {
    Metadata {
        id: String,
        video_id: String,
        title: String,
        duration: String,
        thumbnail: String,
        filesize: f64,
        resolution: Option<String>,
        playlist_title: Option<String>,
        playlist_count: Option<u32>,
    },
    Progress {
        id: String,
        #[serde(rename = "type")]
        kind: MediaKind,
        progress: i32,
        stage: Stage,
        error_message: Option<String>,
        output_path: Option<String>,
        playlist_downloaded: Option<u32>,
        playlist_file_size: Option<f64>,
    },
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: MediaKind,
    pub progress: i32,
    pub stage: Stage,
    pub error_message: Option<String>,
    pub output_size: Option<u64>,
    pub output_path: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryInstallProgress {
    pub name: String,
    pub percent: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn media_kind_serializes_lowercase() {
        assert_eq!(serde_json::to_string(&MediaKind::Download).unwrap(), "\"download\"");
        assert_eq!(serde_json::to_string(&MediaKind::Convert).unwrap(), "\"convert\"");
        assert_eq!(serde_json::to_string(&MediaKind::Merge).unwrap(), "\"merge\"");
    }

    #[test]
    fn stage_serializes_lowercase() {
        assert_eq!(serde_json::to_string(&Stage::Downloading).unwrap(), "\"downloading\"");
        assert_eq!(serde_json::to_string(&Stage::Converting).unwrap(), "\"converting\"");
        assert_eq!(serde_json::to_string(&Stage::Merging).unwrap(), "\"merging\"");
        assert_eq!(serde_json::to_string(&Stage::Completed).unwrap(), "\"completed\"");
        assert_eq!(serde_json::to_string(&Stage::Error).unwrap(), "\"error\"");
    }

    #[test]
    fn download_event_tags_and_camel_cases_fields() {
        let meta = DownloadEvent::Metadata {
            id: "x".into(), video_id: "v".into(), title: "t".into(),
            duration: "0:01".into(), thumbnail: "u".into(), filesize: 1.0,
            resolution: Some("720p".into()), playlist_title: None, playlist_count: None,
        };
        let json = serde_json::to_string(&meta).unwrap();
        assert!(json.contains(r#""event":"metadata""#));
        assert!(json.contains(r#""videoId":"v""#));
        assert!(json.contains(r#""data":{"#));

        let prog = DownloadEvent::Progress {
            id: "x".into(), kind: MediaKind::Download, progress: 50,
            stage: Stage::Downloading, error_message: None, output_path: None,
            playlist_downloaded: Some(1), playlist_file_size: Some(2.0),
        };
        let json = serde_json::to_string(&prog).unwrap();
        assert!(json.contains(r#""event":"progress""#));
        assert!(json.contains(r#""type":"download""#));
        assert!(json.contains(r#""playlistFileSize":2.0"#));
    }
}
