import { useShallow } from "zustand/shallow";
import { createFileRoute } from "@tanstack/react-router";
import { JobQueue } from "@/components/job-queue";
import { QueueActionsHeader } from "@/components/queue-actions-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropZone } from "@/components/file-drop-zone";
import { MERGE_VIDEO_EXTENSIONS } from "@/lib/constants";
import { MergeJobRow } from "@/features/merge/components/merge-job-row";
import { useMergeStore } from "@/stores/merge-store";
import { useBinariesStore } from "@/stores/binaries-store";
import { useSettingsStore } from "@/stores/settings-store";
import { SavePathButton } from "@/components/save-path-button";
import { Merge } from "lucide-react";
import { EmptyQueue } from "@/components/empty-queue";
import { toast } from "sonner";
import type { MergeDirection } from "@/lib/types";

export const Route = createFileRoute("/merge")({
  component: MergePage,
});

function MergePage() {
  const mainFiles = useMergeStore((s) => s.mainFiles);
  const bgFiles = useMergeStore((s) => s.bgFiles);
  const direction = useMergeStore((s) => s.direction);
  const savePath = useSettingsStore((s) => s.downloadPath);
  const ffprobeInstalled = useBinariesStore((s) => s.ffprobe.installed);
  const itemIds = useMergeStore(useShallow((s) => s.items.map((i) => i.id)));
  const itemCount = useMergeStore((s) => s.items.length);
  const isMerging = useMergeStore((s) =>
    s.items.some((i) => i.stage === "merging"),
  );

  const addMainFiles = useMergeStore((s) => s.addMainFiles);
  const addBgFiles = useMergeStore((s) => s.addBgFiles);
  const removeMainFile = useMergeStore((s) => s.removeMainFile);
  const removeBgFile = useMergeStore((s) => s.removeBgFile);
  const clearMainFiles = useMergeStore((s) => s.clearMainFiles);
  const clearBgFiles = useMergeStore((s) => s.clearBgFiles);
  const setDirection = useMergeStore((s) => s.setDirection);
  const startAll = useMergeStore((s) => s.startAll);
  const clearCompleted = useMergeStore((s) => s.clearCompleted);

  const canStart =
    mainFiles.length > 0 && bgFiles.length > 0 && !!savePath && !isMerging;

  const hasQueued = useMergeStore((s) =>
    s.items.some((i) => i.stage === "queued"),
  );

  const handleStartAll = () => {
    if (!ffprobeInstalled) {
      toast.error(
        "ffprobe é necessário para mesclar vídeos. Instale-o na página de Configurações, em Binários.",
      );
      return;
    }
    if (!savePath) {
      toast.warning("Selecione uma pasta de destino antes de mesclar.");
      return;
    }
    startAll();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <FileDropZone
          extensions={MERGE_VIDEO_EXTENSIONS}
          label="Vídeos Principais"
          files={mainFiles}
          onAddFiles={addMainFiles}
          onRemoveFile={removeMainFile}
          onClear={clearMainFiles}
        />
        <FileDropZone
          extensions={MERGE_VIDEO_EXTENSIONS}
          label="Vídeos de Background"
          files={bgFiles}
          onAddFiles={addBgFiles}
          onRemoveFile={removeBgFile}
          onClear={clearBgFiles}
        />
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={direction}
          onValueChange={(v) => setDirection(v as MergeDirection)}
        >
          <SelectTrigger className="w-[120px] text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            <SelectItem value="vertical">Vertical</SelectItem>
            <SelectItem value="horizontal">Horizontal</SelectItem>
          </SelectContent>
        </Select>
        <SavePathButton />
      </div>

      {itemCount > 0 && (
        <QueueActionsHeader
          countLabel={`${itemCount} ${itemCount === 1 ? "merge" : "merges"}`}
          primaryLabel="Mesclar tudo"
          primaryActiveLabel="Mesclando..."
          isActive={isMerging}
          primaryDisabled={!canStart && !hasQueued}
          onPrimary={handleStartAll}
          confirmTitle="Limpar merges?"
          confirmDescription="Todos os merges concluídos serão removidos da lista."
          confirmLabel="Limpar"
          clearTooltip="Limpar concluídos"
          onConfirmClear={clearCompleted}
        />
      )}

      {itemIds.length === 0 && mainFiles.length === 0 ? (
        <EmptyQueue
          icon={Merge}
          title="Nenhum vídeo adicionado"
          description="Adicione vídeos nas áreas acima para começar"
        />
      ) : (
        itemIds.length > 0 && (
          <JobQueue
            ids={itemIds}
            renderRow={(id) => <MergeJobRow id={id} />}
            containerClassName="flex flex-col gap-2"
            variant="slideX"
            staggerCap={20}
          />
        )
      )}
    </div>
  );
}
