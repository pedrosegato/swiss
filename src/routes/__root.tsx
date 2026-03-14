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
import type { DownloadStage, ConvertStage } from "@/lib/types";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { location } = useRouterState();
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

  const rafRef = useRef(0);
  useEffect(() => {
    const unsub1 = useDownloadStore.subscribe(() => scheduleDockUpdate());
    const unsub2 = useConvertStore.subscribe(() => scheduleDockUpdate());

    function scheduleDockUpdate() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const downloads = useDownloadStore.getState().items;
        const converts = useConvertStore.getState().items;
        const active = [
          ...downloads.filter(
            (i) => i.stage === "downloading" || i.stage === "converting",
          ),
          ...converts.filter((i) => i.stage === "converting"),
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
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <TooltipProvider>
      <Navbar />
      <motion.main
        key={location.pathname}
        className="relative z-[1] px-4 py-5 sm:p-7"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <Outlet />
      </motion.main>
      <BinaryInstallDialog
        open={showInstallDialog}
        onOpenChange={setShowInstallDialog}
      />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
