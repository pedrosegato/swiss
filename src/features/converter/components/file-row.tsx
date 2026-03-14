import type { ConvertItem } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight, Film, Minus, Music } from "lucide-react";
import { isVideoFormat } from "@/lib/constants";

interface FileRowProps {
  item: ConvertItem;
}

export function FileRow({ item }: FileRowProps) {
  const isDone = item.stage === "completed";
  const isError = item.stage === "error";
  const isConverting = item.stage === "converting";
  const isInputVideo = isVideoFormat(item.inputExt.replace(".", ""));
  const Icon = isInputVideo ? Film : Music;

  return (
    <tr className="bg-card transition-colors hover:bg-card/80 group">
      <td className="px-3 py-2.5 border border-r-0 border-border rounded-l w-[104px]">
        {item.thumbnailLoading ? (
          <div className="w-[96px] h-[54px] bg-muted/30 rounded animate-pulse" />
        ) : item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-[96px] h-[54px] object-cover rounded"
          />
        ) : (
          <div className="w-[96px] h-[54px] bg-muted/30 rounded flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
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

      <td className="px-3 py-2.5 border-y border-border">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-[10px] text-muted-foreground"
          >
            {item.inputExt}
          </Badge>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <Badge variant="outline" className="font-mono text-[10px]">
            {item.outputFormat}
          </Badge>
        </div>
      </td>

      <td className="px-3 py-2.5 border border-l-0 border-border rounded-r w-[130px]">
        {isError && item.errorMessage ? (
          <p className="text-[10px] text-destructive/80 line-clamp-2">
            {item.errorMessage}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Progress value={item.progress} className="h-[3px] flex-1" />
            <span
              className={cn(
                "font-mono text-[10px] min-w-[28px] text-right",
                isDone
                  ? "text-muted-foreground"
                  : isConverting
                    ? "text-primary"
                    : "text-muted-foreground/60",
              )}
            >
              {isDone ? (
                "ok"
              ) : isConverting ? (
                `${item.progress}%`
              ) : (
                <Minus className="w-3 h-3" />
              )}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}
