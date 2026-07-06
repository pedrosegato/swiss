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
import { formatSize } from "@/lib/utils";
import { useBinariesStore } from "@/stores/binaries-store";
import { useDownloadStore } from "@/stores/download-store";
import { useConvertStore } from "@/stores/convert-store";
import { useMergeStore } from "@/stores/merge-store";
import { ScrollArea } from "@/components/ui/scroll-area";

const TERMINAL_STAGES = new Set(["completed", "error"]);

function shouldApplyProgress(
  current: { stage: string } | undefined,
  incomingStage: string,
): boolean {
  if (!current) return true;
  if (current.stage === "error" && !TERMINAL_STAGES.has(incomingStage)) {
    return false;
  }
  return true;
}

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
    const unsubscribe = ipc.onProgress((msg) => {
      if (msg.type === "download") {
        const current = useDownloadStore
          .getState()
          .items.find((i) => i.id === msg.id);
        if (!shouldApplyProgress(current, msg.stage)) return;
        updateDownload(msg.id, {
          progress: msg.progress,
          stage: msg.stage,
          errorMessage: msg.errorMessage ?? undefined,
          outputPath: msg.outputPath ?? undefined,
          ...(msg.playlistDownloaded != null
            ? { playlistDownloaded: msg.playlistDownloaded }
            : {}),
          ...(msg.playlistFileSize
            ? { fileSize: formatSize(msg.playlistFileSize) }
            : {}),
          ...(msg.playlistFileSize
            ? { fileSizeBytes: msg.playlistFileSize }
            : {}),
        });
      } else if (msg.type === "convert") {
        const current = useConvertStore
          .getState()
          .items.find((i) => i.id === msg.id);
        if (!shouldApplyProgress(current, msg.stage)) return;
        updateConvert(msg.id, {
          progress: msg.progress,
          stage: msg.stage,
          errorMessage: msg.errorMessage ?? undefined,
          outputSize: msg.outputSize ?? undefined,
          outputPath: msg.outputPath ?? undefined,
        });
      } else if (msg.type === "merge") {
        const current = useMergeStore
          .getState()
          .items.find((i) => i.id === msg.id);
        if (!shouldApplyProgress(current, msg.stage)) return;
        updateMerge(msg.id, {
          progress: msg.progress,
          stage: msg.stage,
          errorMessage: msg.errorMessage ?? undefined,
          outputSize: msg.outputSize ?? undefined,
          outputPath: msg.outputPath ?? undefined,
        });
        if (msg.stage === "completed" && msg.outputPath) {
          const outputPath = msg.outputPath;
          const id = msg.id;
          ipc.extractMergeThumbnail(outputPath).then((thumb) => {
            if (thumb) updateMerge(id, { thumbnail: thumb });
          });
        }
      } else {
        console.warn("Unrouted progress message", msg);
      }
    });
    return unsubscribe;
  }, [updateDownload, updateConvert, updateMerge]);

  useEffect(() => {
    const unsubscribe = ipc.onMetadata((data) => {
      const update = useDownloadStore.getState().updateItem;
      const existing = useDownloadStore
        .getState()
        .items.find((i) => i.id === data.id);
      const displayQuality = data.resolution ?? existing?.quality;
      update(data.id, {
        videoId: data.videoId,
        title: data.title,
        duration: data.duration,
        thumbnail: data.thumbnail,
        fileSize: data.filesize > 0 ? formatSize(data.filesize) : undefined,
        fileSizeBytes: data.filesize > 0 ? data.filesize : undefined,
        ...(displayQuality ? { quality: displayQuality } : {}),
        stage: "downloading",
        ...(data.playlistTitle
          ? {
              playlistTitle: data.playlistTitle,
              playlistCount: data.playlistCount ?? undefined,
            }
          : {}),
      });
    });
    return unsubscribe;
  }, []);

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

  // Remove completed items whose output file/folder was deleted or moved
  useEffect(() => {
    const interval = setInterval(async () => {
      const downloads = useDownloadStore.getState().items;
      const converts = useConvertStore.getState().items;
      const merges = useMergeStore.getState().items;

      const paths: {
        id: string;
        path: string;
        kind: "download" | "convert" | "merge";
      }[] = [];
      for (const i of downloads) {
        if (i.stage === "completed" && i.outputPath)
          paths.push({ id: i.id, path: i.outputPath, kind: "download" });
      }
      for (const i of converts) {
        if (i.stage === "completed" && i.outputPath)
          paths.push({ id: i.id, path: i.outputPath, kind: "convert" });
      }
      for (const i of merges) {
        if (i.stage === "completed" && i.outputPath)
          paths.push({ id: i.id, path: i.outputPath, kind: "merge" });
      }

      if (paths.length === 0) return;

      const missing = await ipc.checkPaths(
        paths.map(({ id, path }) => ({ id, path })),
      );
      if (missing.length === 0) return;

      const missingSet = new Set(missing);
      const removeDownload = useDownloadStore.getState().removeItem;
      const removeConvert = useConvertStore.getState().removeItem;
      const removeMerge = useMergeStore.getState().removeItem;

      for (const { id, kind } of paths) {
        if (!missingSet.has(id)) continue;
        if (kind === "download") removeDownload(id);
        else if (kind === "convert") removeConvert(id);
        else removeMerge(id);
      }
    }, 10_000);

    return () => clearInterval(interval);
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
