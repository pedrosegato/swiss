import { Progress } from "@/components/ui/progress";
import { ErrorLog } from "@/components/error-log";
import { cn } from "@/lib/utils";

interface JobProgressProps {
  stage: string;
  progress: number;
  stageLabel: string;
  errorMessage?: string;
  isError: boolean;
  isDone: boolean;
}

export function JobProgress({
  progress,
  stageLabel,
  errorMessage,
  isError,
  isDone,
}: JobProgressProps) {
  if (isError) {
    return <ErrorLog message={errorMessage} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-[10px]",
            isDone ? "text-muted-foreground" : "text-secondary-foreground",
          )}
        >
          {stageLabel}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] font-medium tabular-nums",
            isDone ? "text-muted-foreground" : "text-primary",
          )}
        >
          {isDone ? "100%" : `${progress}%`}
        </span>
      </div>
      <Progress
        value={progress}
        className={cn(
          "h-[3px]",
          isDone && "[&_[data-slot=progress-indicator]]:bg-success",
        )}
      />
    </div>
  );
}
