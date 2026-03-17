import { formatSize } from "@/lib/utils";
import { useMergeStore } from "@/stores/merge-store";
import { ipc } from "@/lib/ipc";
import { MergeProgress } from "./merge-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { X, FolderOpen, RotateCcw } from "lucide-react";

interface MergeJobRowProps {
  id: string;
}

export function MergeJobRow({ id }: MergeJobRowProps) {
  const item = useMergeStore((s) => s.items.find((i) => i.id === id));
  const updateItem = useMergeStore((s) => s.updateItem);
  const removeItem = useMergeStore((s) => s.removeItem);

  if (!item) return null;

  const isDone = item.stage === "completed";
  const isError = item.stage === "error";
  const isMerging = item.stage === "merging";

  const handleCancel = () => {
    ipc.cancelMerge(item.id);
    updateItem(item.id, {
      stage: "error",
      progress: 0,
      errorMessage: "Cancelado pelo usuário",
    });
  };

  const handleRetry = () => {
    updateItem(item.id, {
      stage: "merging",
      progress: 0,
      errorMessage: undefined,
      outputSize: undefined,
      outputPath: undefined,
    });
    ipc.startMerge({
      id: item.id,
      mainPath: item.mainPath,
      bgPath: item.bgPath,
      direction: item.direction,
      savePath: item.savePath,
    });
  };

  const handleOpenFolder = () => {
    if (item.outputPath) {
      ipc.showItemInFolder(item.outputPath);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg group transition-colors hover:bg-card/80 p-3">
      <div className="flex items-start gap-3">
        <div className="w-[80px] shrink-0">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="w-full aspect-video rounded-md object-cover"
            />
          ) : isError ? (
            <div className="w-full aspect-video rounded-md bg-black" />
          ) : (
            <Skeleton className="w-full aspect-video rounded-md" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-[450] block truncate">
            {item.mainName}
          </span>
          <span className="text-[10px] text-muted-foreground block truncate">
            + {item.bgName}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isDone && item.outputSize && (
            <span className="font-mono text-[10px] text-muted-foreground mr-1">
              {formatSize(item.outputSize)}
            </span>
          )}
          {isMerging && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={handleCancel}
                >
                  <X className="w-3 h-3" />
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
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleRetry}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tentar novamente</TooltipContent>
            </Tooltip>
          )}
          {isDone && item.outputPath && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleOpenFolder}
                >
                  <FolderOpen className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir pasta</TooltipContent>
            </Tooltip>
          )}
          {!isMerging && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeItem(item.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remover</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="mt-2">
        <MergeProgress
          stage={item.stage}
          progress={item.progress}
          errorMessage={item.errorMessage}
        />
      </div>
    </div>
  );
}
