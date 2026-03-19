import type { ConvertFormat } from "@/lib/types";
import { cn, formatSize } from "@/lib/utils";
import { useConvertStore } from "@/stores/convert-store";
import { useSettingsStore } from "@/stores/settings-store";
import { ipc } from "@/lib/ipc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobActions } from "@/components/job-actions";
import { JobProgress } from "@/components/job-progress";
import {
  CONVERT_VIDEO_FORMATS,
  CONVERT_AUDIO_FORMATS,
  CONVERT_STAGE_LABELS,
  isVideoFormat,
} from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Film, Music } from "lucide-react";

interface FileRowProps {
  id: string;
}

export function FileRow({ id }: FileRowProps) {
  const item = useConvertStore((s) => s.items.find((i) => i.id === id));
  const updateItem = useConvertStore((s) => s.updateItem);
  const removeItem = useConvertStore((s) => s.removeItem);

  if (!item) return null;

  const isDone = item.stage === "completed";
  const isError = item.stage === "error";
  const isConverting = item.stage === "converting";
  const isQueued = item.stage === "queued";

  const handleCancel = () => {
    ipc.cancelConversion(item.id);
    updateItem(item.id, {
      stage: "error",
      progress: 0,
      errorMessage: "Cancelado pelo usuário",
    });
  };

  const handleRetry = async () => {
    const savePath = useSettingsStore.getState().downloadPath;
    if (!savePath) return;

    const missing = await ipc.checkPaths([
      { id: item.id, path: item.inputPath },
    ]);
    if (missing.length > 0) {
      toast.warning("Arquivo de entrada não encontrado.");
      removeItem(item.id);
      return;
    }

    updateItem(item.id, {
      stage: "converting",
      progress: 0,
      errorMessage: undefined,
      outputSize: undefined,
      outputPath: undefined,
    });
    ipc.startConversion({
      id: item.id,
      inputPath: item.inputPath,
      outputFormat: item.outputFormat,
      quality: item.quality,
      savePath,
    });
  };

  const handleOpenFolder = () => {
    if (item.outputPath) {
      ipc.showItemInFolder(item.outputPath);
    }
  };

  const handleFormatChange = (format: ConvertFormat) => {
    updateItem(item.id, { outputFormat: format });
  };

  const Icon = isVideoFormat(item.inputExt.replace(".", "")) ? Film : Music;

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg group transition-all",
        isError ? "border-destructive/30" : "hover:border-border/80",
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="w-[52px] h-[36px] shrink-0 rounded overflow-hidden">
          {item.thumbnailLoading ? (
            <Skeleton className="w-full h-full" />
          ) : item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium leading-tight truncate">
            {item.inputName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[10px] text-muted-foreground">
              {item.inputSize}
            </span>
            {isDone && item.outputSize && (
              <>
                <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatSize(item.outputSize)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className="font-mono text-[9px] px-1.5 py-0 h-5 text-muted-foreground"
          >
            {item.inputExt.replace(".", "")}
          </Badge>
          <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/40" />
          {isQueued ? (
            <Select
              value={item.outputFormat}
              onValueChange={(v) => handleFormatChange(v as ConvertFormat)}
            >
              <SelectTrigger className="h-5 text-[9px] font-mono w-[68px] px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
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
            <Badge
              variant="outline"
              className="font-mono text-[9px] px-1.5 py-0 h-5"
            >
              {item.outputFormat}
            </Badge>
          )}
        </div>

        <JobActions
          isActive={isConverting}
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
            stageLabel={CONVERT_STAGE_LABELS[item.stage]}
            errorMessage={item.errorMessage}
            isError={isError}
            isDone={isDone}
          />
        </div>
      )}
    </div>
  );
}
