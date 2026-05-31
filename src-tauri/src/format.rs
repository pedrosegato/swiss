pub fn format_duration(seconds: f64) -> String {
    let total = seconds.max(0.0) as u64;
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    if h > 0 {
        format!("{h}:{m:02}:{s:02}")
    } else {
        format!("{m}:{s:02}")
    }
}

fn quality_to_height(q: &str) -> Option<u32> {
    Some(match q {
        "4K" => 2160,
        "2K" | "1440p" => 1440,
        "1080p" => 1080,
        "720p" => 720,
        "480p" => 480,
        "360p" => 360,
        _ => return None,
    })
}

pub fn build_format_string(format: &str, quality: &str) -> String {
    let video_formats = ["mp4", "mkv", "webm"];
    if !video_formats.contains(&format) {
        return "bestaudio/best".into();
    }

    let is_mp4 = format == "mp4";
    let codec_filter = if is_mp4 { "[vcodec~='^(h264|avc)']" } else { "" };
    let audio_codec_filter = if is_mp4 { "[acodec~='^(aac|mp4a)']" } else { "" };

    if quality == "Máxima" {
        return if is_mp4 {
            format!("bestvideo{codec_filter}+bestaudio{audio_codec_filter}/bestvideo+bestaudio/best")
        } else {
            "bestvideo+bestaudio/best".into()
        };
    }

    let Some(h) = quality_to_height(quality) else {
        return if is_mp4 {
            format!("bestvideo{codec_filter}+bestaudio{audio_codec_filter}/bestvideo+bestaudio/best")
        } else {
            "bestvideo+bestaudio/best".into()
        };
    };

    if is_mp4 {
        format!(
            "bestvideo[height<={h}]{codec_filter}+bestaudio{audio_codec_filter}/bestvideo[height<={h}]+bestaudio/best[height<={h}]/bestvideo+bestaudio/best"
        )
    } else {
        format!("bestvideo[height<={h}]+bestaudio/best[height<={h}]/bestvideo+bestaudio/best")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_duration_under_hour() {
        assert_eq!(format_duration(0.0), "0:00");
        assert_eq!(format_duration(65.0), "1:05");
        assert_eq!(format_duration(3599.0), "59:59");
    }

    #[test]
    fn format_duration_with_hours() {
        assert_eq!(format_duration(3600.0), "1:00:00");
        assert_eq!(format_duration(3661.0), "1:01:01");
    }

    #[test]
    fn build_format_audio_returns_bestaudio() {
        assert_eq!(build_format_string("mp3", "192 kbps"), "bestaudio/best");
        assert_eq!(build_format_string("wav", "Máxima"), "bestaudio/best");
    }

    #[test]
    fn build_format_mp4_max() {
        let s = build_format_string("mp4", "Máxima");
        assert!(s.contains("bestvideo[vcodec~='^(h264|avc)']+bestaudio[acodec~='^(aac|mp4a)']"));
        assert!(s.ends_with("/best"));
    }

    #[test]
    fn build_format_webm_1080p() {
        let s = build_format_string("webm", "1080p");
        assert_eq!(s, "bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best");
    }

    #[test]
    fn build_format_mp4_4k() {
        let s = build_format_string("mp4", "4K");
        assert!(s.contains("height<=2160"));
        assert!(s.contains("vcodec~='^(h264|avc)'"));
    }

    #[test]
    fn build_format_unknown_quality_falls_back_to_max() {
        let s = build_format_string("mkv", "weird");
        assert_eq!(s, "bestvideo+bestaudio/best");
    }
}
