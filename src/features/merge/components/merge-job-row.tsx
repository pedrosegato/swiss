import { cn, formatSize } from "@/lib/utils";
import { useMergeStore } from "@/stores/merge-store";
import { MERGE_STAGE_LABELS } from "@/lib/constants";
import { ipc } from "@/lib/ipc";
import { Skeleton } from "@/components/ui/skeleton";
import { JobActions } from "@/components/job-actions";
import { JobProgress } from "@/components/job-progress";

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
  const isQueued = item.stage === "queued";

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
    <div
      className={cn(
        "bg-card border border-border rounded-lg group transition-all",
        isError ? "border-destructive/30" : "hover:border-border/80",
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="w-[52px] h-[36px] shrink-0 rounded overflow-hidden">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : isError ? (
            <div className="w-full h-full bg-muted/20 rounded" />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium leading-tight truncate">
            {item.mainName}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">
            + {item.bgName}
          </p>
        </div>

        {isDone && item.outputSize && (
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
            {formatSize(item.outputSize)}
          </span>
        )}

        <JobActions
          isActive={isMerging}
          isError={isError}
          isDone={isDone}
          outputPath={item.outputPath}
          onCancel={handleCancel}
          onRetry={handleRetry}
          onOpenFolder={handleOpenFolder}
          onRemove={() => removeItem(item.id)}
        />
      </div>

      {!isQueued && (
        <div className="px-3 pb-2.5">
          <JobProgress
            stage={item.stage}
            progress={item.progress}
            stageLabel={MERGE_STAGE_LABELS[item.stage]}
            errorMessage={item.errorMessage}
            isError={isError}
            isDone={isDone}
          />
        </div>
      )}
    </div>
  );
}
