import { useState } from "react";
import type { DownloadItem } from "@/lib/types";
import { DOWNLOAD_STAGE_LABELS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ipc } from "@/lib/ipc";
import { Bug } from "lucide-react";

interface DownloadCardProps {
  item: DownloadItem;
}

export function DownloadCard({ item }: DownloadCardProps) {
  const isDone = item.stage === "completed";
  const isQueued = item.stage === "queued";
  const isFetching = item.stage === "fetching";
  const [showLog, setShowLog] = useState(false);

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
    <Card
      className="overflow-hidden transition-all hover:border-border/80 hover:-translate-y-px cursor-pointer flex flex-col p-0 gap-0"
      onClick={() => item.url && ipc.openExternal(item.url)}
    >
      {/* Thumbnail */}
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

      {/* Body */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1">
        <div className="text-[12.5px] font-medium leading-snug line-clamp-2 flex-1">
          {item.title}
        </div>

        <div className="mt-auto">
          <div
            className={cn(
              "text-[10.5px] mb-1",
              item.stage === "error"
                ? "text-destructive"
                : isDone
                  ? "text-muted-foreground"
                  : isQueued
                    ? "text-muted-foreground/60"
                    : "text-secondary-foreground",
            )}
          >
            {DOWNLOAD_STAGE_LABELS[item.stage]}
          </div>

          {item.stage === "error" ? (
            <div className="mb-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[9.5px] px-0 gap-1 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLog(!showLog);
                }}
              >
                <Bug className="w-3 h-3" />
                {showLog ? "Ocultar log" : "Ver log"}
              </Button>
              {showLog && item.errorMessage ? (
                <pre className="mt-1 text-[9px] text-destructive/80 bg-muted/50 rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono">
                  {item.errorMessage}
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
                item.stage === "error"
                  ? "text-destructive"
                  : isDone
                    ? "text-muted-foreground"
                    : isQueued
                      ? "text-muted-foreground/60"
                      : "text-primary",
              )}
            >
              {item.stage === "error"
                ? "falhou"
                : isDone
                  ? "concluído"
                  : isQueued
                    ? "na fila"
                    : `${item.progress}%`}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
