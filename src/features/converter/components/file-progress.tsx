import { Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ErrorLog } from "@/components/error-log";
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

  return (
    <div className="flex items-center gap-2">
      <Progress value={progress} className="h-[3px] flex-1" />
      <span
        className={cn(
          "font-mono text-[10px] min-w-[28px] text-right",
          isDone
            ? "text-success"
            : isConverting
              ? "text-primary"
              : "text-muted-foreground/60",
        )}
      >
        {isDone ? (
          "ok"
        ) : isConverting ? (
          `${progress}%`
        ) : (
          <Minus className="w-3 h-3" />
        )}
      </span>
    </div>
  );
}
