import type {
  VideoFormat,
  AudioFormat,
  ConvertVideoFormat,
  ConvertAudioFormat,
} from "./types";

export const VIDEO_FORMATS: VideoFormat[] = ["mp4", "mkv", "webm"];
export const AUDIO_FORMATS: AudioFormat[] = ["mp3", "wav", "flac", "aac"];

export const CONVERT_VIDEO_FORMATS: ConvertVideoFormat[] = [
  "mp4",
  "mkv",
  "avi",
  "webm",
  "mov",
];
export const CONVERT_AUDIO_FORMATS: ConvertAudioFormat[] = [
  "mp3",
  "wav",
  "flac",
  "aac",
  "wma",
];

export const VIDEO_QUALITIES = [
  "Máxima",
  "4K",
  "2K",
  "1440p",
  "1080p",
  "720p",
  "480p",
  "360p",
];
export const AUDIO_QUALITIES = [
  "Máxima",
  "320 kbps",
  "256 kbps",
  "192 kbps",
  "128 kbps",
];
export const CONVERT_VIDEO_QUALITIES = [
  "Original",
  "4K",
  "2K",
  "1440p",
  "1080p",
  "720p",
  "480p",
];
export const CONVERT_AUDIO_QUALITIES = [
  "320 kbps",
  "256 kbps",
  "192 kbps",
  "128 kbps",
];

export const BROWSERS = [
  "chrome",
  "firefox",
  "safari",
  "edge",
  "brave",
  "opera",
] as const;

export function isVideoFormat(fmt: string): boolean {
  return (
    VIDEO_FORMATS.includes(fmt as VideoFormat) ||
    CONVERT_VIDEO_FORMATS.includes(fmt as ConvertVideoFormat)
  );
}

export const DOWNLOAD_STAGE_LABELS: Record<string, string> = {
  queued: "Na fila",
  fetching: "Buscando info...",
  downloading: "Baixando...",
  converting: "Convertendo...",
  completed: "Concluído",
  error: "Erro",
};

export const CONVERT_STAGE_LABELS: Record<string, string> = {
  queued: "Na fila",
  converting: "Convertendo...",
  completed: "Concluído",
  error: "Erro",
};

export const SORT_LABELS: Record<string, string> = {
  recent: "Mais recentes",
  oldest: "Mais antigos",
  largest: "Maior tamanho",
  smallest: "Menor tamanho",
};
