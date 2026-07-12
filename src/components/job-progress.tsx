import type { ReactNode } from "react";
import { Minus } from "lucide-react";
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
  isQueued?: boolean;
  suffix?: ReactNode;
  onStopPropagation?: boolean;
  variant?: "row" | "card";
}

export function JobProgress({
  progress,
  stageLabel,
  errorMessage,
  isError,
  isDone,
  isQueued = false,
  suffix,
  onStopPropagation = false,
  variant = "row",
}: JobProgressProps) {
  if (isError) {
    return (
      <ErrorLog message={errorMessage} onStopPropagation={onStopPropagation} />
    );
  }

  const textSize = "text-[11px]";
  const headerMargin = variant === "card" ? "mb-1.5" : "mb-1";

  return (
    <div>
      <div className={cn("flex items-center justify-between", headerMargin)}>
        <span
          className={cn(
            textSize,
            isDone
              ? "text-muted-foreground"
              : isQueued
                ? "text-muted-foreground/60"
                : "text-secondary-foreground",
          )}
        >
          {stageLabel}
          {suffix}
        </span>
        <span
          className={cn(
            "font-medium tabular-nums",
            textSize,
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
            `${progress}%`
          )}
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
