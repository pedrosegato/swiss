import type { ConvertItem, ConvertFormat } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowRight, Film, Minus, Music, X } from "lucide-react";
import {
  isVideoFormat,
  CONVERT_VIDEO_FORMATS,
  CONVERT_AUDIO_FORMATS,
} from "@/lib/constants";
import { useConvertStore } from "@/stores/convert-store";

interface FileRowProps {
  item: ConvertItem;
}

export function FileRow({ item }: FileRowProps) {
  const updateItem = useConvertStore((s) => s.updateItem);
  const removeItem = useConvertStore((s) => s.removeItem);
  const isDone = item.stage === "completed";
  const isError = item.stage === "error";
  const isConverting = item.stage === "converting";
  const isQueued = item.stage === "queued";
  const isInputVideo = isVideoFormat(item.inputExt.replace(".", ""));
  const Icon = isInputVideo ? Film : Music;

  return (
    <tr className="bg-card transition-colors hover:bg-card/80 group">
      <td className="px-3 py-2.5 border border-r-0 border-border rounded-l w-[104px]">
        {item.thumbnailLoading ? (
          <Skeleton className="w-[96px] h-[54px] rounded" />
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
          {isQueued ? (
            <Select
              value={item.outputFormat}
              onValueChange={(v) =>
                updateItem(item.id, { outputFormat: v as ConvertFormat })
              }
            >
              <SelectTrigger className="h-6 text-[10px] font-mono w-[80px] px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Vídeo</SelectLabel>
                  {CONVERT_VIDEO_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Áudio</SelectLabel>
                  {CONVERT_AUDIO_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="font-mono text-[10px]">
              .{item.outputFormat}
            </Badge>
          )}
        </div>
      </td>

      <td className="px-3 py-2.5 border-y border-border w-[130px]">
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

      <td className="px-1.5 py-2.5 border border-l-0 border-border rounded-r">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeItem(item.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover</TooltipContent>
        </Tooltip>
      </td>
    </tr>
  );
}
