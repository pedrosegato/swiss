import type { ConvertItem } from "@/lib/types";
import { CONVERT_STAGE_LABELS } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FileRowProps {
  item: ConvertItem;
}

export function FileRow({ item }: FileRowProps) {
  const isDone = item.stage === "completed";
  const isQueued = item.stage === "queued";

  return (
    <tr className="bg-card transition-colors hover:bg-card/80 group">
      <td className="px-3 py-2.5 border border-border rounded-l">
        <div className="w-[34px] h-[34px] bg-muted/20 rounded flex items-center justify-center font-mono text-[9px] text-muted-foreground uppercase font-medium tracking-wide">
          {item.inputExt}
        </div>
      </td>
      <td className="px-3 py-2.5 border-y border-border">
        <span className="text-[12.5px] font-[450] whitespace-nowrap overflow-hidden text-ellipsis block max-w-[280px]">
          {item.inputName}
        </span>
      </td>
      <td className="px-3 py-2.5 border-y border-border">
        <span className="font-mono text-[10.5px] text-muted-foreground whitespace-nowrap">
          {item.inputSize}
        </span>
      </td>
      <td className="px-3 py-2.5 border-y border-border text-center text-muted-foreground text-[13px]">
        →
      </td>
      <td className="px-3 py-2.5 border-y border-border">
        <Badge variant="outline" className="font-mono text-[10px]">
          .{item.outputFormat}
        </Badge>
      </td>
      <td className="px-3 py-2.5 border-y border-border w-[110px]">
        {item.stage === "error" && item.errorMessage ? (
          <p className="text-[10px] text-destructive/80 line-clamp-2">
            {item.errorMessage}
          </p>
        ) : (
          <>
            <Progress value={item.progress} className="h-[3px] mb-1" />
            <span
              className={cn(
                "text-[10px]",
                isDone
                  ? "text-muted-foreground"
                  : isQueued
                    ? "text-muted-foreground/60"
                    : "text-secondary-foreground",
              )}
            >
              {CONVERT_STAGE_LABELS[item.stage]}
            </span>
          </>
        )}
      </td>
      <td className="px-3 py-2.5 border border-border rounded-r text-right">
        <span
          className={cn(
            "font-mono text-[10.5px] min-w-[42px] inline-block",
            isDone
              ? "text-muted-foreground"
              : isQueued
                ? "text-muted-foreground/60"
                : "text-primary",
          )}
        >
          {isDone ? "ok" : isQueued ? "fila" : `${item.progress}%`}
        </span>
      </td>
    </tr>
  );
}
