import { useState, useEffect, useRef } from "react";
import {
  createRootRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { motion } from "motion/react";
import { Navbar } from "@/components/navbar";
import { BinaryInstallDialog } from "@/components/binary-install-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ipc } from "@/lib/ipc";
import { useBinariesStore } from "@/stores/binaries-store";
import { useDownloadStore } from "@/stores/download-store";
import { useConvertStore } from "@/stores/convert-store";
import { useMergeStore } from "@/stores/merge-store";
import type { DownloadStage, ConvertStage, MergeStage } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { location } = useRouterState();
  const setYtdlp = useBinariesStore((s) => s.setYtdlp);
  const setFfmpeg = useBinariesStore((s) => s.setFfmpeg);
  const setFfprobe = useBinariesStore((s) => s.setFfprobe);
  const updateDownload = useDownloadStore((s) => s.updateItem);
  const updateConvert = useConvertStore((s) => s.updateItem);
  const updateMerge = useMergeStore((s) => s.updateItem);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  useEffect(() => {
    ipc.checkBinaries().then(({ ytdlp, ffmpeg, ffprobe }) => {
      setYtdlp({ name: "yt-dlp", ...ytdlp });
      setFfmpeg({ name: "ffmpeg", ...ffmpeg });
      setFfprobe({ name: "ffprobe", ...ffprobe });

      if (!ytdlp.installed || !ffmpeg.installed) {
        setShowInstallDialog(true);
      }
    });
  }, [setYtdlp, setFfmpeg, setFfprobe]);

  useEffect(() => {
    const unsubscribe = ipc.onProgress(
      ({
        id,
        type,
        progress,
        stage,
        errorMessage,
        outputSize,
        outputPath,
        playlistDownloaded,
      }) => {
        if (type === "download") {
          updateDownload(id, {
            progress,
            stage: stage as DownloadStage,
            errorMessage,
            outputPath,
            ...(playlistDownloaded != null ? { playlistDownloaded } : {}),
          });
        } else if (type === "convert") {
          updateConvert(id, {
            progress,
            stage: stage as ConvertStage,
            errorMessage,
            outputSize,
            outputPath,
          });
        } else if (type === "merge") {
          updateMerge(id, {
            progress,
            stage: stage as MergeStage,
            errorMessage,
            outputSize,
            outputPath,
          });
          if (stage === "completed" && outputPath) {
            ipc.extractMergeThumbnail(outputPath).then((thumb) => {
              if (thumb) updateMerge(id, { thumbnail: thumb });
            });
          }
        }
      },
    );
    return unsubscribe;
  }, [updateDownload, updateConvert, updateMerge]);

  const rafRef = useRef(0);
  useEffect(() => {
    const unsub1 = useDownloadStore.subscribe(() => scheduleDockUpdate());
    const unsub2 = useConvertStore.subscribe(() => scheduleDockUpdate());
    const unsub3 = useMergeStore.subscribe(() => scheduleDockUpdate());

    function scheduleDockUpdate() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const downloads = useDownloadStore.getState().items;
        const converts = useConvertStore.getState().items;
        const merges = useMergeStore.getState().items;
        const active = [
          ...downloads.filter(
            (i) => i.stage === "downloading" || i.stage === "converting",
          ),
          ...converts.filter((i) => i.stage === "converting"),
          ...merges.filter((i) => i.stage === "merging"),
        ];

        if (active.length === 0) {
          ipc.setDockProgress(-1);
        } else {
          const avg =
            active.reduce((sum, i) => sum + i.progress, 0) / active.length;
          ipc.setDockProgress(avg / 100);
        }
      });
    }

    return () => {
      unsub1();
      unsub2();
      unsub3();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <TooltipProvider>
      <Navbar />
      <ScrollArea className="h-[calc(100vh-3rem)]">
        <motion.main
          key={location.pathname}
          className="relative z-[1] px-4 py-5 sm:p-7"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <Outlet />
        </motion.main>
      </ScrollArea>

      <BinaryInstallDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
      />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
