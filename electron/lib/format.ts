export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const QUALITY_TO_HEIGHT: Record<string, number> = {
  "4K": 2160,
  "2K": 1440,
  "1440p": 1440,
  "1080p": 1080,
  "720p": 720,
  "480p": 480,
  "360p": 360,
};

/**
 * Build yt-dlp format string from format + quality.
 * Max quality grabs the absolute best available.
 * Higher resolutions (4K, 2K, 1440p) use height<=N with a fallback to best,
 * so if the video maxes out at 1080p, yt-dlp still picks the best available.
 */
export function buildFormatString(format: string, quality: string): string {
  const videoFormats = ["mp4", "mkv", "webm"];
  if (!videoFormats.includes(format)) {
    return "bestaudio/best";
  }

  const codecFilter = format === "mp4" ? "[vcodec~='^(h264|avc)']" : "";
  const audioCodecFilter = format === "mp4" ? "[acodec~='^(aac|mp4a)']" : "";

  if (quality === "Máxima") {
    if (format === "mp4") {
      return `bestvideo${codecFilter}+bestaudio${audioCodecFilter}/bestvideo+bestaudio/best`;
    }
    return "bestvideo+bestaudio/best";
  }

  const height = QUALITY_TO_HEIGHT[quality];
  if (!height) {
    if (format === "mp4") {
      return `bestvideo${codecFilter}+bestaudio${audioCodecFilter}/bestvideo+bestaudio/best`;
    }
    return "bestvideo+bestaudio/best";
  }

  if (format === "mp4") {
    return `bestvideo[height<=${height}]${codecFilter}+bestaudio${audioCodecFilter}/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/bestvideo+bestaudio/best`;
  }

  return `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/bestvideo+bestaudio/best`;
}
