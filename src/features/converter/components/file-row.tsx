import type { ConvertFormat } from "@/lib/types";
import { formatSize } from "@/lib/utils";
import { useConvertStore } from "@/stores/convert-store";
import { useSettingsStore } from "@/stores/settings-store";
import { ipc } from "@/lib/ipc";
import { FileThumbnail } from "./file-thumbnail";
import { FileFormatBadges } from "./file-format-badges";
import { FileProgress } from "./file-progress";
import { FileActions } from "./file-actions";

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

  const handleRetry = () => {
    updateItem(item.id, {
      stage: "converting",
      progress: 0,
      errorMessage: undefined,
      outputSize: undefined,
      outputPath: undefined,
    });
    const savePath = useSettingsStore.getState().downloadPath;
    if (!savePath) return;
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

  const actions = (
    <FileActions
      isConverting={isConverting}
      isError={isError}
      isDone={isDone}
      outputPath={item.outputPath}
      onCancel={handleCancel}
      onRetry={handleRetry}
      onOpenFolder={handleOpenFolder}
      onRemove={() => removeItem(item.id)}
    />
  );

  const formatBadges = (
    <FileFormatBadges
      inputExt={item.inputExt}
      outputFormat={item.outputFormat}
      isQueued={isQueued}
      onOutputFormatChange={handleFormatChange}
    />
  );

  const progress = (
    <FileProgress
      stage={item.stage}
      progress={item.progress}
      errorMessage={item.errorMessage}
    />
  );

  return (
    <div className="bg-card border border-border rounded-lg group transition-colors hover:bg-card/80">
      {/* Card (default) */}
      <div className="p-3 lg:hidden">
        <div className="flex gap-3">
          <div className="w-[100px] shrink-0">
            <FileThumbnail
              inputExt={item.inputExt}
              thumbnail={item.thumbnail}
              thumbnailLoading={item.thumbnailLoading}
              className="w-full aspect-video"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[12.5px] font-[450] overflow-hidden text-ellipsis block line-clamp-2">
              {item.inputName}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {item.inputSize}
            </span>
          </div>
          <div className="shrink-0">{actions}</div>
        </div>
        <div className="flex items-center gap-3 mt-2.5">
          {formatBadges}
          {isDone && item.outputSize && (
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">
              {formatSize(item.outputSize)}
            </span>
          )}
        </div>
        <div className="mt-2">{progress}</div>
      </div>

      {/* Row (lg+) */}
      <div className="hidden lg:flex items-center">
        <div className="px-3 py-2.5 w-[104px] shrink-0">
          <FileThumbnail
            inputExt={item.inputExt}
            thumbnail={item.thumbnail}
            thumbnailLoading={item.thumbnailLoading}
            className="w-[96px] h-[54px]"
          />
        </div>
        <div className="px-3 py-2.5 flex-1 min-w-0">
          <span className="text-[12.5px] font-[450] whitespace-nowrap overflow-hidden text-ellipsis block">
            {item.inputName}
          </span>
        </div>
        <div className="px-3 py-2.5 shrink-0">
          <span className="font-mono text-[10.5px] text-muted-foreground whitespace-nowrap">
            {item.inputSize}
          </span>
        </div>
        <div className="px-3 py-2.5 shrink-0">{formatBadges}</div>
        <div className="px-3 py-2.5 w-[160px] shrink-0">{progress}</div>
        <div className="px-3 py-2.5 shrink-0">
          <span className="font-mono text-[10.5px] text-muted-foreground whitespace-nowrap">
            {isDone && item.outputSize ? formatSize(item.outputSize) : null}
          </span>
        </div>
        <div className="px-1.5 py-2.5 shrink-0">{actions}</div>
      </div>
    </div>
  );
}
