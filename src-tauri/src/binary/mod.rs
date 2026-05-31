pub mod installer;
pub mod resolver;

use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BinaryName {
    #[serde(rename = "yt-dlp")]
    YtDlp,
    #[serde(rename = "ffmpeg")]
    Ffmpeg,
    #[serde(rename = "ffprobe")]
    Ffprobe,
}

impl BinaryName {
    pub fn as_str(&self) -> &'static str {
        match self {
            BinaryName::YtDlp => "yt-dlp",
            BinaryName::Ffmpeg => "ffmpeg",
            BinaryName::Ffprobe => "ffprobe",
        }
    }
    pub fn version_flag(&self) -> &'static str {
        match self {
            BinaryName::YtDlp => "--version",
            BinaryName::Ffmpeg | BinaryName::Ffprobe => "-version",
        }
    }
}

impl FromStr for BinaryName {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "yt-dlp" => Ok(Self::YtDlp),
            "ffmpeg" => Ok(Self::Ffmpeg),
            "ffprobe" => Ok(Self::Ffprobe),
            _ => Err(format!("unknown binary: {s}")),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub path: String,
    pub source: BinarySource,
}

#[derive(Debug, Copy, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BinarySource {
    System,
    Local,
    None,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnInfo {
    pub command: String,
    pub prefix_args: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binary_name_from_str() {
        assert_eq!(BinaryName::from_str("yt-dlp").unwrap(), BinaryName::YtDlp);
        assert_eq!(BinaryName::from_str("ffmpeg").unwrap(), BinaryName::Ffmpeg);
        assert_eq!(
            BinaryName::from_str("ffprobe").unwrap(),
            BinaryName::Ffprobe
        );
        assert!(BinaryName::from_str("rm").is_err());
    }

    #[test]
    fn binary_name_serializes_kebab() {
        let s = serde_json::to_string(&BinaryName::YtDlp).unwrap();
        assert_eq!(s, "\"yt-dlp\"");
    }
}
