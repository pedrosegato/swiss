import { useState } from "react";
import type { DownloadItem } from "@/lib/types";
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
import { cn } from "@/lib/utils";
import { ipc } from "@/lib/ipc";
import { useDownloadStore } from "@/stores/download-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Bug,
  FolderOpen,
  RefreshCw,
  Square,
} from "lucide-react";

interface DownloadCardProps {
  item: DownloadItem;
}

export function DownloadCard({ item }: DownloadCardProps) {
  const updateItem = useDownloadStore((s) => s.updateItem);
  const isDone = item.stage === "completed";
  const isQueued = item.stage === "queued";
  const isFetching = item.stage === "fetching";
  const isActive =
    item.stage === "downloading" || item.stage === "converting";
  const isError = item.stage === "error";
  const [showLog, setShowLog] = useState(false);
  const [copied, setCopied] = useState(false);

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
    updateItem(item.id, {
      stage: "fetching",
      progress: 0,
      errorMessage: undefined,
    });
    const savePath = useSettingsStore.getState().downloadPath;
    ipc.startDownload({
      id: item.id,
      url: item.url,
      format: item.format,
      quality: item.quality,
      savePath,
    });
  };

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.outputPath) {
      ipc.showItemInFolder(item.outputPath);
    } else {
      ipc.openPath(item.savePath);
    }
  };

  if (isFetching) {
    return (
      <Card className="overflow-hidden flex flex-col p-0 gap-0">
        <Skeleton className="w-full aspect-video rounded-none relative">
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
            Carregando metadados do vídeo...
          </span>
        </Skeleton>
        <div className="px-3 pt-2.5 pb-3 space-y-2">
          <Skeleton className="h-3.5 w-[85%]" />
          <Skeleton className="h-3 w-[60%]" />
          <Skeleton className="h-[3px] w-full mt-1" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-[40%]" />
            <Skeleton className="h-2.5 w-[15%]" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden transition-all hover:border-border/80 hover:-translate-y-px flex flex-col p-0 gap-0">
      {/* Thumbnail + Title — click opens video */}
      <div
        className="cursor-pointer"
        onClick={() => item.url && ipc.openExternal(item.url)}
      >
        <div className="w-full aspect-video bg-muted/20 relative overflow-hidden">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              className="w-full h-full object-cover block"
              alt=""
            />
          ) : null}
          {item.duration ? (
            <span className="absolute bottom-1.5 right-1.5 font-mono text-[9.5px] font-medium text-white bg-black/70 px-1.5 py-0.5 rounded-sm tracking-wide">
              {item.duration}
            </span>
          ) : null}
        </div>
        <div className="px-3 pt-2.5 text-[12.5px] font-medium leading-snug line-clamp-2">
          {item.title}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 pt-1.5 pb-3 flex flex-col flex-1">
        <div className="mt-auto">
          {/* Stage label + action buttons */}
          <div className="flex items-center justify-between mb-1">
            <span
              className={cn(
                "text-[10.5px]",
                isError
                  ? "text-destructive"
                  : isDone
                    ? "text-success"
                    : isQueued
                      ? "text-muted-foreground/60"
                      : "text-secondary-foreground",
              )}
            >
              {DOWNLOAD_STAGE_LABELS[item.stage]}
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

          {isError ? (
            <div className="mb-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[9.5px] !px-0 gap-1 text-muted-foreground hover:text-foreground !hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLog(!showLog);
                }}
              >
                <Bug className="w-3 h-3" />
                {showLog ? "Ocultar log" : "Ver log"}
              </Button>
              {showLog && item.errorMessage ? (
                <pre
                  className="mt-1 text-[9px] text-destructive/80 bg-muted/50 rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono cursor-pointer hover:bg-muted/70 transition-colors"
                  title="Clique para copiar"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(item.errorMessage!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copiado!" : item.errorMessage}
                </pre>
              ) : null}
            </div>
          ) : (
            <Progress value={item.progress} className="h-[3px] mb-1.5" />
          )}

          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-2">
              <span>{item.quality}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {item.format}
              </Badge>
              {item.fileSize ? <span>{item.fileSize}</span> : null}
            </span>
            <span
              className={cn(
                "font-mono text-[10.5px] font-medium",
                isError
                  ? "text-destructive"
                  : isDone
                    ? "text-muted-foreground"
                    : isQueued
                      ? "text-muted-foreground/60"
                      : "text-primary",
              )}
            >
              {isError
                ? "falhou"
                : isDone
                  ? "concluído"
                  : isQueued
                    ? "na fila"
                    : `${item.progress}%`}
            </span>
          </div>

          {/* Output filename */}
          {isDone && item.outputPath && (
            <p className="text-[9px] text-muted-foreground/60 font-mono mt-1 truncate">
              {item.outputPath.split("/").pop()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
