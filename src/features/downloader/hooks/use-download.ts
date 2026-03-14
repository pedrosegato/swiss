import { useMutation } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { useDownloadStore } from "@/stores/download-store";
import type { DownloadFormat } from "@/lib/types";

export function useStartDownload() {
  const addItem = useDownloadStore((s) => s.addItem);

  return useMutation({
    mutationFn: ipc.startDownload,
    onSuccess: ({ id }, variables) => {
      addItem({
        id,
        url: variables.url,
        title: "Baixando...",
        format: variables.format as DownloadFormat,
        quality: variables.quality,
        stage: "downloading",
        progress: 0,
        savePath: variables.savePath,
        createdAt: Date.now(),
      });
    },
  });
}
