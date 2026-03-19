import { useShallow } from "zustand/shallow";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { MERGE_VIDEO_EXTENSIONS } from "@/lib/constants";
import { MergeJobRow } from "@/features/merge/components/merge-job-row";
import { useMergeStore } from "@/stores/merge-store";
import { useBinariesStore } from "@/stores/binaries-store";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import { ipc } from "@/lib/ipc";
import { FolderOpen, Merge, Play, Trash2 } from "lucide-react";
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
  const setSavePath = useSettingsStore((s) => s.setDownloadPath);
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

  const handleSelectFolder = async () => {
    const selected = await ipc.selectFolder();
    if (selected) setSavePath(selected);
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
        <Button
          variant="ghost"
          onClick={handleSelectFolder}
          className="h-auto gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="w-3 h-3" />
          <span className="font-mono truncate max-w-[400px]">
            {savePath || "Selecione uma pasta de destino"}
          </span>
        </Button>
      </div>

      {itemCount > 0 && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider font-medium">
              {itemCount} {itemCount === 1 ? "merge" : "merges"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                className={cn(
                  "text-[11px] h-7 px-3",
                  isMerging && "animate-pulse",
                )}
                onClick={handleStartAll}
                disabled={!canStart && !hasQueued}
              >
                <Play className="w-3 h-3" />
                {isMerging ? "Mesclando..." : "Mesclar tudo"}
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
                  title="Limpar merges?"
                  description="Todos os merges concluídos serão removidos da lista."
                  confirmLabel="Limpar"
                  onConfirm={clearCompleted}
                />
                <TooltipContent>Limpar concluídos</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </>
      )}

      {itemIds.length === 0 && mainFiles.length === 0 ? (
        <EmptyQueue
          icon={Merge}
          title="Nenhum vídeo adicionado"
          description="Adicione vídeos nas áreas acima para começar"
        />
      ) : (
        itemIds.length > 0 && (
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
                  <MergeJobRow id={id} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      )}
    </div>
  );
}
