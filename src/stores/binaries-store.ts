import { create } from "zustand";
import type { BinaryInfo } from "@/lib/types";

interface BinariesState {
  ytdlp: BinaryInfo;
  ffmpeg: BinaryInfo;
  ffprobe: BinaryInfo;

  setYtdlp: (info: BinaryInfo) => void;
  setFfmpeg: (info: BinaryInfo) => void;
  setFfprobe: (info: BinaryInfo) => void;
}

export const useBinariesStore = create<BinariesState>((set) => ({
  ytdlp: { name: "yt-dlp", version: null, installed: false },
  ffmpeg: { name: "ffmpeg", version: null, installed: false },
  ffprobe: { name: "ffprobe", version: null, installed: false },

  setYtdlp: (info) => set({ ytdlp: info }),
  setFfmpeg: (info) => set({ ffmpeg: info }),
  setFfprobe: (info) => set({ ffprobe: info }),
}));
