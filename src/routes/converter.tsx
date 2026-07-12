import { useShallow } from "zustand/shallow";
import { createFileRoute } from "@tanstack/react-router";
import { PillSelect } from "@/components/pill-select";
import { JobQueue } from "@/components/job-queue";
import { QueueBar } from "@/components/queue-bar";
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
import { FileAudio } from "lucide-react";
import { EmptyQueue } from "@/components/empty-queue";
import { SavePathButton } from "@/components/save-path-button";
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
      <FileDropZone
        extensions={CONVERT_ALL_FORMATS}
        showFormats
        onDrop={handleFilesDropped}
      />
      <div className="flex items-center gap-2">
        <PillSelect
          value={format}
          onValueChange={handleFormatChange}
          groups={[
            { label: "Vídeo", options: CONVERT_VIDEO_FORMATS },
            { label: "Áudio", options: CONVERT_AUDIO_FORMATS },
          ]}
          uppercaseItems
        />
        <div className="ml-auto">
          <SavePathButton />
        </div>
      </div>

      {itemCount > 0 && (
        <QueueBar
          countLabel={`${itemCount} ${itemCount === 1 ? "arquivo" : "arquivos"}`}
          primary={{
            label: "Converter tudo",
            activeLabel: "Convertendo...",
            isActive: isConverting,
            disabled: !hasQueued && !isConverting,
            onClick: handleStartAll,
          }}
          clear={{
            title: "Limpar arquivos?",
            description:
              "Todos os arquivos da lista serão removidos. Conversões ativas serão canceladas.",
            confirmLabel: "Limpar",
            tooltip: "Limpar arquivos",
            onConfirm: clearItems,
          }}
        />
      )}

      {itemIds.length === 0 ? (
        <EmptyQueue
          icon={FileAudio}
          title="Nenhum arquivo adicionado"
          description="Arraste arquivos ou clique na área acima"
        />
      ) : (
        <JobQueue
          ids={itemIds}
          renderRow={(id) => <FileRow id={id} />}
          containerClassName="flex flex-col gap-2"
          variant="slideX"
          staggerCap={20}
        />
      )}
    </div>
  );
}
