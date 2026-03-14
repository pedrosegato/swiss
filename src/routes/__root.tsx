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
      ({ id, type, progress, stage, errorMessage }) => {
        if (type === "download") {
          updateDownload(id, {
            progress,
            stage: stage as DownloadStage,
            errorMessage,
          });
        } else {
          updateConvert(id, { progress, stage: stage as ConvertStage });
        }
      },
    );
    return unsubscribe;
  }, [updateDownload, updateConvert]);

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
