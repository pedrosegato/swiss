import { useState } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { BinaryInstallDialog } from "@/components/binary-install-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ipc } from "@/lib/ipc";
import { useBinariesStore } from "@/stores/binaries-store";
import { useDownloadStore } from "@/stores/download-store";
import { useConvertStore } from "@/stores/convert-store";
import type { DownloadStage, ConvertStage } from "@/lib/types";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const setYtdlp = useBinariesStore((s) => s.setYtdlp);
  const setFfmpeg = useBinariesStore((s) => s.setFfmpeg);
  const updateDownload = useDownloadStore((s) => s.updateItem);
  const updateConvert = useConvertStore((s) => s.updateItem);
  const downloadItems = useDownloadStore((s) => s.items);
  const convertItems = useConvertStore((s) => s.items);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  useEffect(() => {
    ipc.checkBinaries().then(({ ytdlp, ffmpeg }) => {
      setYtdlp({ name: "yt-dlp", ...ytdlp });
      setFfmpeg({ name: "ffmpeg", ...ffmpeg });

      if (!ytdlp.installed || !ffmpeg.installed) {
        setShowInstallDialog(true);
      }
    });
  }, [setYtdlp, setFfmpeg]);

  useEffect(() => {
    const unsubscribe = ipc.onProgress(
      ({ id, type, progress, stage, errorMessage, outputSize, outputPath }) => {
        if (type === "download") {
          updateDownload(id, {
            progress,
            stage: stage as DownloadStage,
            errorMessage,
            outputPath,
          });
        } else {
          updateConvert(id, {
            progress,
            stage: stage as ConvertStage,
            errorMessage,
            outputSize,
            outputPath,
          });
        }
      },
    );
    return unsubscribe;
  }, [updateDownload, updateConvert]);

  // Dock/taskbar progress
  useEffect(() => {
    const activeDownloads = downloadItems.filter(
      (i) => i.stage === "downloading" || i.stage === "converting",
    );
    const activeConverts = convertItems.filter(
      (i) => i.stage === "converting",
    );
    const allActive = [...activeDownloads, ...activeConverts];

    if (allActive.length === 0) {
      ipc.setDockProgress(-1);
    } else {
      const avg =
        allActive.reduce((sum, i) => sum + i.progress, 0) / allActive.length;
      ipc.setDockProgress(avg / 100);
    }
  }, [downloadItems, convertItems]);

  return (
    <TooltipProvider>
      <Navbar />
      <main className="relative z-[1] p-7">
        <Outlet />
      </main>
      <BinaryInstallDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
      />
    </TooltipProvider>
  );
}
