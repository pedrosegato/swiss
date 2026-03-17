import { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
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
import { toast } from "sonner";
import { Download } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

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
        ...(data.playlistTitle
          ? {
              playlistTitle: data.playlistTitle,
              playlistCount: data.playlistCount,
            }
          : {}),
      });
    });
    return unsubscribe;
  }, [updateItem]);

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

      {itemIds.length > 0 && (
        <>
          <Separator className="mb-5" />
          <QueueHeader />
        </>
      )}

      {itemIds.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Empty className="py-12 border-0">
            <EmptyHeader>
              <EmptyMedia>
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Download className="w-8 h-8 text-muted-foreground" />
                </motion.div>
              </EmptyMedia>
              <EmptyTitle className="text-[14px]">
                Nenhum download na fila
              </EmptyTitle>
              <EmptyDescription className="text-[12px]">
                Cole uma URL acima para começar
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </motion.div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
          <AnimatePresence mode="popLayout">
            {itemIds.map((id, i) => (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i < 12 ? i * 0.03 : 0 }}
              >
                <DownloadCard id={id} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <BinaryInstallDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
      />
    </>
  );
}
