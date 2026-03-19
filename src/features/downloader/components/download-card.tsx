import { DOWNLOAD_STAGE_LABELS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ErrorLog } from "@/components/error-log";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { ipc } from "@/lib/ipc";
import { useDownloadStore } from "@/stores/download-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Dot,
  FolderOpen,
  ListVideo,
  Minus,
  RefreshCw,
  Square,
} from "lucide-react";
import { toast } from "sonner";

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

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    ipc.cancelDownload(item.id);
    updateItem(item.id, {
      stage: "error",
      errorMessage: "Cancelado pelo usuário",
    });
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    const settings = useSettingsStore.getState();
    const savePath = settings.downloadPath;
    if (!savePath) {
      toast.warning(
        "Selecione uma pasta de destino antes de tentar novamente.",
      );
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

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.outputPath) {
      isPlaylist
        ? ipc.openPath(item.outputPath)
        : ipc.showItemInFolder(item.outputPath);
    } else {
      ipc.openPath(item.savePath);
    }
  };

  if (isFetching) {
    return (
      <Card className="overflow-hidden flex flex-col p-0 gap-0">
        <div className="w-full aspect-video bg-muted/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>
          <Skeleton className="absolute top-1.5 right-1.5 h-4 w-8 rounded-full" />
        </div>
        <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1">
          <div className="space-y-1.5 mb-2">
            <Skeleton className="h-3.5 w-[80%]" />
            <Skeleton className="h-3.5 w-[55%]" />
          </div>
          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between mb-1.5">
              <Skeleton className="h-2.5 w-[90px]" />
              <Skeleton className="h-2.5 w-[30px]" />
            </div>
            <Skeleton className="h-[3px] w-full" />
            <div className="flex items-center justify-between pt-0.5">
              <Skeleton className="h-2.5 w-[60px]" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden flex flex-col p-0 gap-0 transition-all hover:border-border/80 hover:-translate-y-px",
        isError && "border-destructive/30",
      )}
    >
      <div
        className="w-full aspect-video bg-muted/20 relative overflow-hidden cursor-pointer"
        onClick={() => item.url && ipc.openExternal(item.url)}
      >
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            className="w-full h-full object-cover block"
            alt=""
          />
        ) : null}

        {item.duration && (
          <span className="absolute bottom-1.5 right-1.5 font-mono text-[9.5px] font-medium text-white bg-black/70 px-1.5 py-0.5 rounded-sm tracking-wide">
            {item.duration}
          </span>
        )}

        {isPlaylist && item.playlistCount ? (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[9.5px] font-medium text-white bg-black/70 px-1.5 py-0.5 rounded-sm">
            <ListVideo className="w-3 h-3" />
            {item.playlistCount} vídeos
          </span>
        ) : null}

        <Badge
          variant="outline"
          className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 bg-black/60 text-white border-white/20 font-mono uppercase tracking-wider"
        >
          {item.format}
        </Badge>
      </div>

      <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1">
        <p className="text-[12.5px] font-medium leading-snug line-clamp-2 mb-2">
          {isPlaylist ? item.playlistTitle : item.title}
        </p>

        <div className="mt-auto space-y-2">
          {isError ? (
            <ErrorLog message={item.errorMessage} onStopPropagation />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    "text-[10.5px]",
                    isError
                      ? "text-destructive"
                      : isDone
                        ? "text-muted-foreground"
                        : isQueued
                          ? "text-muted-foreground/60"
                          : "text-secondary-foreground",
                  )}
                >
                  {DOWNLOAD_STAGE_LABELS[item.stage]}
                  {isPlaylist && isActive && item.playlistCount
                    ? ` (${item.playlistDownloaded ?? 0} de ${item.playlistCount})`
                    : null}
                </span>
                <span
                  className={cn(
                    "font-mono text-[10.5px] font-medium tabular-nums",
                    isDone
                      ? "text-muted-foreground"
                      : isQueued
                        ? "text-muted-foreground/60"
                        : "text-primary",
                  )}
                >
                  {isDone ? (
                    "100%"
                  ) : isQueued ? (
                    <Minus className="w-3 h-3" />
                  ) : (
                    `${item.progress}%`
                  )}
                </span>
              </div>
              <Progress
                value={item.progress}
                className={cn(
                  "h-[3px]",
                  isDone &&
                    "[&_[data-slot=progress-indicator]]:bg-success",
                )}
              />
            </div>
          )}
          <div className="flex items-center justify-between pt-0.5">
            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span>{item.quality}</span>
              {item.fileSize && (
                <>
                  <Dot className="w-3 h-3 text-muted-foreground/50" />
                  <span>{item.fileSize}</span>
                </>
              )}
            </span>
            <div className="flex items-center gap-0.5">
              {isActive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                      onClick={handleCancel}
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancelar</TooltipContent>
                </Tooltip>
              )}
              {isError && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={handleRetry}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tentar novamente</TooltipContent>
                </Tooltip>
              )}
              {isDone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={handleOpenFolder}
                    >
                      <FolderOpen className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Abrir pasta</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
