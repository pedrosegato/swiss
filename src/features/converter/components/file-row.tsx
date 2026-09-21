import { ArrowRight, Film, Music } from "lucide-react";
import { toast } from "sonner";

import { FormatSelect } from "@/components/format-select";
import { JobActions } from "@/components/job-actions";
import { JobProgress } from "@/components/job-progress";
import { JobShell } from "@/components/job-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONVERT_AUDIO_FORMATS,
  CONVERT_STAGE_LABELS,
  CONVERT_VIDEO_FORMATS,
  isVideoFormat,
} from "@/lib/constants";
import { ipc } from "@/lib/ipc";
import type { ConvertFormat } from "@/lib/types";
import { formatSize } from "@/lib/utils";
import { useConvertStore } from "@/stores/convert-store";
import { useSettingsStore } from "@/stores/settings-store";

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
    if (!savePath) {
      toast.warning("Selecione uma pasta de destino antes de tentar novamente.");
      return;
    }

    const missing = await ipc.checkPaths([{ id: item.id, path: item.inputPath }]);
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
    <JobShell isError={isError} className="group">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="h-[36px] w-[52px] shrink-0 overflow-hidden rounded">
          {item.thumbnailLoading ? (
            <Skeleton className="h-full w-full" />
          ) : item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="bg-muted/30 flex h-full w-full items-center justify-center">
              <Icon className="text-muted-foreground h-3.5 w-3.5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-tight font-medium">{item.inputName}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-muted-foreground text-[11px]">{item.inputSize}</span>
            {isDone && item.outputSize && (
              <>
                <ArrowRight className="text-muted-foreground/40 h-2.5 w-2.5" />
                <span className="text-muted-foreground text-[11px]">
                  {formatSize(item.outputSize)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className="text-muted-foreground h-5 px-1.5 py-0 text-[10px]">
            {item.inputExt.replace(".", "")}
          </Badge>
          <ArrowRight className="text-muted-foreground/40 h-2.5 w-2.5" />
          {isQueued ? (
            <FormatSelect
              value={item.outputFormat}
              onValueChange={(v) => handleFormatChange(v as ConvertFormat)}
              groups={[
                { label: "Vídeo", options: CONVERT_VIDEO_FORMATS },
                { label: "Áudio", options: CONVERT_AUDIO_FORMATS },
              ]}
              triggerClassName="h-6 text-[10px] rounded-full w-auto min-w-[62px] px-2.5 gap-1"
            />
          ) : (
            <Badge variant="outline" className="h-5 px-1.5 py-0 text-[10px]">
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
    </JobShell>
  );
}
