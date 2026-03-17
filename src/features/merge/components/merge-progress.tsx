import { Progress } from "@/components/ui/progress";
import { ErrorLog } from "@/components/error-log";
import { MERGE_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MergeStage } from "@/lib/types";

interface MergeProgressProps {
  stage: MergeStage;
  progress: number;
  errorMessage?: string;
}

export function MergeProgress({
  stage,
  progress,
  errorMessage,
}: MergeProgressProps) {
  if (stage === "error") {
    return <ErrorLog message={errorMessage} />;
  }

  const isDone = stage === "completed";
  const isMerging = stage === "merging";
  const isQueued = stage === "queued";

  return (
    <div>
      <Progress value={progress} className="h-[3px]" />
      <div className="flex items-center justify-between mt-1">
        <span
          className={cn(
            "text-[10px]",
            isDone
              ? "text-success"
              : isMerging
                ? "text-secondary-foreground"
                : "text-muted-foreground/60",
          )}
        >
          {MERGE_STAGE_LABELS[stage]}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] font-medium",
            isDone
              ? "text-muted-foreground"
              : isMerging
                ? "text-primary"
                : "text-muted-foreground/60",
          )}
        >
          {isDone
            ? "Concluído"
            : isMerging
              ? `${progress}%`
              : isQueued
                ? "Na fila"
                : "—"}
        </span>
      </div>
    </div>
  );
}
