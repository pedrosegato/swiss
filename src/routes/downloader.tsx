import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";

import { BinaryInstallDialog } from "@/components/binary-install-dialog";
import { EmptyQueue } from "@/components/empty-queue";
import { JobQueue } from "@/components/job-queue";
import { DownloadBar } from "@/features/downloader/components/download-bar";
import { DownloadCard } from "@/features/downloader/components/download-card";
import { QueueHeader } from "@/features/downloader/components/queue-header";
import { AUDIO_FORMATS, AUDIO_QUALITIES, VIDEO_FORMATS, VIDEO_QUALITIES } from "@/lib/constants";
import { ipc } from "@/lib/ipc";
import type { DownloadFormat } from "@/lib/types";
import { useBinariesStore } from "@/stores/binaries-store";
import { useDownloadStore } from "@/stores/download-store";
import { useSettingsStore } from "@/stores/settings-store";

export const Route = createFileRoute("/downloader")({
  component: DownloaderPage,
});

function DownloaderPage() {
  const itemIds = useDownloadStore(
    useShallow((s) => {
      const sorted = [...s.items].sort((a, b) => {
        switch (s.sortBy) {
          case "oldest":
            return a.createdAt - b.createdAt;
          case "largest":
            return (b.fileSizeBytes ?? 0) - (a.fileSizeBytes ?? 0);
          case "smallest":
            return (a.fileSizeBytes ?? 0) - (b.fileSizeBytes ?? 0);
          case "recent":
          default:
            return b.createdAt - a.createdAt;
        }
      });
      return sorted.map((i) => i.id);
    }),
  );
  const addItem = useDownloadStore((s) => s.addItem);
  const updateItem = useDownloadStore((s) => s.updateItem);
  const format = useDownloadStore((s) => s.selectedFormat);
  const setFormat = useDownloadStore((s) => s.setSelectedFormat);
  const quality = useDownloadStore((s) => s.selectedQuality);
  const setQuality = useDownloadStore((s) => s.setSelectedQuality);
  const savePath = useSettingsStore((s) => s.downloadPath);
  const useCookies = useSettingsStore((s) => s.useCookies);
  const cookieBrowser = useSettingsStore((s) => s.cookieBrowser);
  const ytdlpInstalled = useBinariesStore((s) => s.ytdlp.installed);
  const ffmpegInstalled = useBinariesStore((s) => s.ffmpeg.installed);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  const handleFetch = async (url: string) => {
    if (!ytdlpInstalled || !ffmpegInstalled) {
      setShowInstallDialog(true);
      return;
    }

    if (!savePath) {
      toast.warning("Selecione uma pasta de destino antes de baixar.");
      return;
    }

    const tempId = crypto.randomUUID();

    let displayTitle: string;
    try {
      displayTitle = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      displayTitle = url;
    }

    addItem({
      id: tempId,
      url,
      title: displayTitle,
      format,
      quality,
      stage: "fetching",
      progress: 0,
      savePath,
      createdAt: Date.now(),
    });

    try {
      await ipc.startDownload({
        id: tempId,
        url,
        format,
        quality,
        savePath,
        cookieBrowser: useCookies ? cookieBrowser : undefined,
      });
    } catch {
      updateItem(tempId, {
        stage: "error",
        errorMessage: "Falha ao iniciar o download",
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <DownloadBar
        format={format}
        onFormatChange={(v) => setFormat(v as DownloadFormat)}
        quality={quality}
        onQualityChange={setQuality}
        videoFormats={VIDEO_FORMATS}
        audioFormats={AUDIO_FORMATS}
        videoQualities={VIDEO_QUALITIES}
        audioQualities={AUDIO_QUALITIES}
        onFetch={handleFetch}
      />

      {itemIds.length > 0 && <QueueHeader />}

      {itemIds.length === 0 ? (
        <EmptyQueue
          icon={Download}
          title="Nenhum download na fila"
          description="Nenhum vídeo baixado"
        />
      ) : (
        <JobQueue
          ids={itemIds}
          renderRow={(id) => <DownloadCard id={id} />}
          containerClassName="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3"
          variant="scale"
          staggerCap={12}
        />
      )}

      <BinaryInstallDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} />
    </div>
  );
}
