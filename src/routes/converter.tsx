import { useShallow } from "zustand/shallow";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FileDropZone } from "@/components/file-drop-zone";
import { formatSize } from "@/lib/utils";
import { ipc } from "@/lib/ipc";
import { FileRow } from "@/features/converter/components/file-row";
import { useConvertStore } from "@/stores/convert-store";
import {
  CONVERT_VIDEO_FORMATS,
  CONVERT_AUDIO_FORMATS,
  CONVERT_ALL_FORMATS,
  isVideoFormat,
} from "@/lib/constants";
import type { ConvertFormat } from "@/lib/types";
import { FileAudio, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyQueue } from "@/components/empty-queue";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "sonner";

export const Route = createFileRoute("/converter")({
  component: ConverterPage,
});

function ConverterPage() {
  const itemIds = useConvertStore(useShallow((s) => s.items.map((i) => i.id)));
  const itemCount = useConvertStore((s) => s.items.length);
  const clearItems = useConvertStore((s) => s.clearItems);
  const startAll = useConvertStore((s) => s.startAll);
  const addItems = useConvertStore((s) => s.addItems);
  const updateItem = useConvertStore((s) => s.updateItem);
  const format = useConvertStore((s) => s.outputFormat);
  const setFormat = useConvertStore((s) => s.setOutputFormat);
  const quality = useConvertStore((s) => s.quality);
  const savePath = useSettingsStore((s) => s.downloadPath);
  const hasQueued = useConvertStore((s) =>
    s.items.some((i) => i.stage === "queued"),
  );
  const isConverting = useConvertStore((s) =>
    s.items.some((i) => i.stage === "converting"),
  );

  const handleStartAll = () => {
    if (!savePath) {
      toast.warning("Selecione uma pasta de destino antes de converter.");
      return;
    }
    startAll();
  };

  const handleFilesDropped = (
    files: { path: string; name: string; size: number; ext: string }[],
  ) => {
    if (!savePath) {
      toast.warning(
        "Selecione uma pasta de destino antes de adicionar arquivos.",
      );
      return;
    }
    if (files.length === 0) return;

    const items = files.map((f) => ({
      id: crypto.randomUUID(),
      inputPath: f.path,
      inputName: f.name,
      inputSize: formatSize(f.size),
      inputExt: f.ext,
      outputFormat: format,
      quality,
      stage: "queued" as const,
      progress: 0,
      savePath,
      thumbnailLoading: isVideoFormat(f.ext.replace(".", "")),
    }));
    addItems(items);

    for (const item of items) {
      if (item.thumbnailLoading) {
        ipc.extractThumbnail(item.inputPath).then((thumbnail) => {
          updateItem(item.id, {
            thumbnailLoading: false,
            ...(thumbnail ? { thumbnail } : {}),
          });
        });
      }
    }
  };

  const handleFormatChange = (v: string | null) => {
    if (!v) return;
    setFormat(v as ConvertFormat);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        <FileDropZone
          extensions={CONVERT_ALL_FORMATS}
          showFormats
          onDrop={handleFilesDropped}
        />
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-[100px] text-xs h-8">
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
      </div>

      {itemCount > 0 && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider font-medium">
              {itemCount} {itemCount === 1 ? "arquivo" : "arquivos"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                className={cn(
                  "text-[11px] h-7 px-3",
                  isConverting && "animate-pulse",
                )}
                onClick={handleStartAll}
                disabled={!hasQueued && !isConverting}
              >
                <Play className="w-3 h-3" />
                {isConverting ? "Convertendo..." : "Converter tudo"}
              </Button>
              <Tooltip>
                <ConfirmDialog
                  trigger={
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                  }
                  title="Limpar arquivos?"
                  description="Todos os arquivos da lista serão removidos. Conversões ativas serão canceladas."
                  confirmLabel="Limpar"
                  onConfirm={clearItems}
                />
                <TooltipContent>Limpar arquivos</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </>
      )}

      {itemIds.length === 0 ? (
        <EmptyQueue
          icon={FileAudio}
          title="Nenhum arquivo adicionado"
          description="Arraste arquivos ou clique na área acima"
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {itemIds.map((id, i) => (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2, delay: i < 20 ? i * 0.03 : 0 }}
              >
                <FileRow id={id} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
