import { Dot, ListVideo, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { JobActions } from "@/components/job-actions";
import { JobProgress } from "@/components/job-progress";
import { JobShell } from "@/components/job-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DOWNLOAD_STAGE_LABELS } from "@/lib/constants";
import { ipc } from "@/lib/ipc";
import { useDownloadStore } from "@/stores/download-store";
import { useSettingsStore } from "@/stores/settings-store";

interface DownloadCardProps {
  id: string;
}

export function DownloadCard({ id }: DownloadCardProps) {
  const item = useDownloadStore((s) => s.items.find((i) => i.id === id));
  const updateItem = useDownloadStore((s) => s.updateItem);

  if (!item) return null;

  const isDone = item.stage === "completed";
  const isQueued = item.stage === "queued";
  const isFetching = item.stage === "fetching";
  const isActive = item.stage === "downloading" || item.stage === "converting";
  const isError = item.stage === "error";
  const isPlaylist = !!item.playlistTitle;

  const handleCancel = () => {
    ipc.cancelDownload(item.id);
    updateItem(item.id, {
      stage: "error",
      errorMessage: "Cancelado pelo usuário",
    });
  };

  const handleRetry = () => {
    const settings = useSettingsStore.getState();
    const savePath = settings.downloadPath;
    if (!savePath) {
      toast.warning("Selecione uma pasta de destino antes de tentar novamente.");
      return;
    }
    updateItem(item.id, {
      stage: "fetching",
      progress: 0,
      errorMessage: undefined,
    });
    ipc.startDownload({
      id: item.id,
      url: item.url,
      format: item.format,
      quality: item.quality,
      savePath,
      cookieBrowser: settings.useCookies ? settings.cookieBrowser : undefined,
    });
  };

  const handleOpenFolder = () => {
    if (item.outputPath) {
      if (isPlaylist) {
        ipc.openPath(item.outputPath);
      } else {
        ipc.showItemInFolder(item.outputPath);
      }
    } else {
      ipc.openPath(item.savePath);
    }
  };

  if (isFetching) {
    return (
      <JobShell className="flex flex-col">
        <div className="bg-muted/20 relative aspect-video w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="text-muted-foreground h-4 w-4" />
            </motion.div>
          </div>
          <Skeleton className="absolute top-1.5 right-1.5 h-4 w-8 rounded-full" />
        </div>
        <div className="flex flex-1 flex-col px-3 pt-2.5 pb-3">
          <div className="mb-2 space-y-1.5">
            <Skeleton className="h-3.5 w-[80%]" />
            <Skeleton className="h-3.5 w-[55%]" />
          </div>
          <div className="mt-auto space-y-2">
            <div className="mb-1.5 flex items-center justify-between">
              <Skeleton className="h-2.5 w-[90px]" />
              <Skeleton className="h-2.5 w-[30px]" />
            </div>
            <Skeleton className="h-[3px] w-full" />
            <div className="flex items-center justify-between pt-0.5">
              <Skeleton className="h-2.5 w-[60px]" />
            </div>
          </div>
        </div>
      </JobShell>
    );
  }

  return (
    <JobShell isError={isError} className="flex flex-col">
      <div
        className="bg-muted/20 relative aspect-video w-full cursor-pointer overflow-hidden"
        onClick={() => item.url && ipc.openExternal(item.url)}
      >
        {item.thumbnail ? (
          <img src={item.thumbnail} className="block h-full w-full object-cover" alt="" />
        ) : null}

        {item.duration && (
          <span className="absolute right-1.5 bottom-1.5 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white">
            {item.duration}
          </span>
        )}

        {isPlaylist && item.playlistCount ? (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <ListVideo className="h-3 w-3" />
            {item.playlistCount} vídeos
          </span>
        ) : null}

        <Badge
          variant="outline"
          className="absolute top-1.5 right-1.5 border-white/20 bg-black/60 px-1.5 py-0 text-[10px] tracking-wider text-white"
        >
          {item.format}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
        <p className="mb-2.5 line-clamp-2 text-[13.5px] leading-snug font-medium">
          {isPlaylist ? item.playlistTitle : item.title}
        </p>

        <div className="mt-auto space-y-2">
          <JobProgress
            stage={item.stage}
            progress={item.progress}
            stageLabel={DOWNLOAD_STAGE_LABELS[item.stage]}
            suffix={
              isPlaylist && isActive && item.playlistCount
                ? ` (${item.playlistDownloaded ?? 0} de ${item.playlistCount})`
                : null
            }
            errorMessage={item.errorMessage}
            isError={isError}
            isDone={isDone}
            isQueued={isQueued}
            onStopPropagation
            variant="card"
          />
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span>{item.quality}</span>
              {item.fileSize && (
                <>
                  <Dot className="text-muted-foreground/50 h-3 w-3" />
                  <span>{item.fileSize}</span>
                </>
              )}
            </span>
            <JobActions
              isActive={isActive}
              isError={isError}
              isDone={isDone}
              onCancel={handleCancel}
              onRetry={handleRetry}
              onOpenFolder={handleOpenFolder}
              showRemove={false}
              openFolderWhenDone
              stopPropagation
            />
          </div>
        </div>
      </div>
    </JobShell>
  );
}
