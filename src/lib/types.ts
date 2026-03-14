export type VideoFormat = "mp4" | "mkv" | "webm";
export type AudioFormat = "mp3" | "wav" | "flac" | "aac";
export type DownloadFormat = VideoFormat | AudioFormat;

export type VideoQuality = "1080p" | "720p" | "480p" | "360p";
export type AudioQuality = "320 kbps" | "256 kbps" | "192 kbps" | "128 kbps";

export type ConvertVideoFormat = "mp4" | "mkv" | "avi" | "webm" | "mov";
export type ConvertAudioFormat = "mp3" | "wav" | "flac" | "aac" | "wma";
export type ConvertFormat = ConvertVideoFormat | ConvertAudioFormat;

export type DownloadStage =
  | "queued"
  | "fetching"
  | "downloading"
  | "converting"
  | "completed"
  | "error";

export type ConvertStage = "queued" | "converting" | "completed" | "error";

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  duration?: string;
  thumbnail?: string;
  format: DownloadFormat;
  quality: string;
  stage: DownloadStage;
  progress: number;
  fileSize?: string;
  savePath: string;
  createdAt: number;
  errorMessage?: string;
}

export interface ConvertItem {
  id: string;
  inputPath: string;
  inputName: string;
  inputSize: string;
  inputExt: string;
  outputFormat: ConvertFormat;
  quality: string;
  stage: ConvertStage;
  progress: number;
  savePath: string;
  errorMessage?: string;
}

export type Browser =
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "brave"
  | "opera";

export type SortOption = "recent" | "oldest" | "largest" | "smallest";

export interface BinaryInfo {
  name: string;
  version: string | null;
  installed: boolean;
  path?: string;
  source?: "system" | "local" | "none";
  downloading?: boolean;
  downloadProgress?: number;
}
