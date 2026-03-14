import { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { UrlInput } from "@/features/downloader/components/url-input";
import { FormatSelects } from "@/components/format-selects";
import {
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  VIDEO_QUALITIES,
  AUDIO_QUALITIES,
} from "@/lib/constants";
import type { DownloadFormat } from "@/lib/types";
import { QueueHeader } from "@/features/downloader/components/queue-header";
import { DownloadCard } from "@/features/downloader/components/download-card";
import { BinaryInstallDialog } from "@/components/binary-install-dialog";
import { useDownloadStore } from "@/stores/download-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useBinariesStore } from "@/stores/binaries-store";
import { ipc } from "@/lib/ipc";
import { formatSize } from "@/lib/utils";

export const Route = createFileRoute("/downloader")({
  component: DownloaderPage,
});

function DownloaderPage() {
  const itemIds = useDownloadStore(useShallow((s) => s.items.map((i) => i.id)));
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

  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  useEffect(() => {
    const unsubscribe = ipc.onMetadata((data) => {
      const displayQuality = data.resolution ?? qualityRef.current;
      updateItem(data.id, {
        videoId: data.videoId,
        title: data.title,
        duration: data.duration,
        thumbnail: data.thumbnail,
        fileSize: data.filesize > 0 ? formatSize(data.filesize) : undefined,
        quality: displayQuality,
        stage: "downloading",
      });
    });
    return unsubscribe;
  }, [updateItem]);

  const handleFetch = async (url: string) => {
    if (!ytdlpInstalled || !ffmpegInstalled) {
      setShowInstallDialog(true);
      return;
    }

    if (!savePath) return;

    const tempId = crypto.randomUUID();

    addItem({
      id: tempId,
      url,
      title: url,
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
    <>
      <div className="flex items-baseline gap-3 mb-5">
        <h1 className="text-lg font-semibold tracking-tight">Download</h1>
      </div>

      <UrlInput onFetch={handleFetch} />
      <FormatSelects
        format={format}
        onFormatChange={(v) => setFormat(v as DownloadFormat)}
        quality={quality}
        onQualityChange={setQuality}
        videoFormats={VIDEO_FORMATS}
        audioFormats={AUDIO_FORMATS}
        videoQualities={VIDEO_QUALITIES}
        audioQualities={AUDIO_QUALITIES}
      />

      <Separator className="mb-5" />

      <QueueHeader />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
        {itemIds.map((id) => (
          <DownloadCard key={id} id={id} />
        ))}
      </div>

      <BinaryInstallDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
      />
    </>
  );
}
