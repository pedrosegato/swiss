import { Progress } from "@/components/ui/progress";
import { ErrorLog } from "@/components/error-log";
import { CONVERT_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ConvertStage } from "@/lib/types";

interface FileProgressProps {
  stage: ConvertStage;
  progress: number;
  errorMessage?: string;
}

export function FileProgress({
  stage,
  progress,
  errorMessage,
}: FileProgressProps) {
  if (stage === "error") {
    return <ErrorLog message={errorMessage} />;
  }

  const isDone = stage === "completed";
  const isConverting = stage === "converting";
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
              : isConverting
                ? "text-secondary-foreground"
                : "text-muted-foreground/60",
          )}
        >
          {CONVERT_STAGE_LABELS[stage]}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] font-medium",
            isDone
              ? "text-muted-foreground"
              : isConverting
                ? "text-primary"
                : "text-muted-foreground/60",
          )}
        >
          {isDone ? "Concluído" : isConverting ? `${progress}%` : isQueued ? "Na fila" : "—"}
        </span>
      </div>
    </div>
  );
}
