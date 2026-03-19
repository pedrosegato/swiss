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
import { FieldLabel } from "@/components/field-label";
import { SavePathPicker } from "@/components/save-path-picker";
import { Merge, Trash2 } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
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

  const pairCount = mainFiles.length;

  const handleStartAll = () => {
    if (!ffprobeInstalled) {
      toast.error(
        "ffprobe é necessário para mesclar vídeos. Instale-o em Configurações → Binários.",
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
    <>
      <div className="flex items-baseline gap-3 mb-5 flex-wrap">
        <h1 className="text-lg font-semibold tracking-tight">Mesclagem</h1>
      </div>

      <div className="flex gap-4 mb-4">
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

      {mainFiles.length > 0 && bgFiles.length > 0 && (
        <div className="text-[11px] text-muted-foreground mb-4">
          {pairCount} {pairCount === 1 ? "merge" : "merges"} —{" "}
          {bgFiles.length < mainFiles.length
            ? `backgrounds em loop (${bgFiles.length} → ${mainFiles.length})`
            : `${bgFiles.length} backgrounds`}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 mb-5">
        <FieldLabel label="Direção">
          <Select
            value={direction}
            onValueChange={(v) => setDirection(v as MergeDirection)}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="horizontal">Horizontal</SelectItem>
            </SelectContent>
          </Select>
        </FieldLabel>

        <FieldLabel label="Salvar em" className="flex-1 min-w-[180px]">
          <SavePathPicker />
        </FieldLabel>

        <div className="flex items-end">
          <Button
            className="text-xs h-9"
            onClick={handleStartAll}
            disabled={!canStart}
          >
            {isMerging ? "Mesclando..." : "Mesclar tudo"}
          </Button>
        </div>
      </div>

      {itemCount > 0 && <Separator className="mb-5" />}

      {itemCount > 0 && (
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            {itemCount} {itemCount === 1 ? "merge" : "merges"}
          </span>
          <Tooltip>
            <ConfirmDialog
              trigger={
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
      )}

      {itemIds.length === 0 && mainFiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Empty className="py-12 border-0">
            <EmptyHeader>
              <EmptyMedia>
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Merge className="w-8 h-8 text-muted-foreground" />
                </motion.div>
              </EmptyMedia>
              <EmptyTitle className="text-[14px]">
                Nenhum vídeo adicionado
              </EmptyTitle>
              <EmptyDescription className="text-[12px]">
                Adicione vídeos nas áreas acima para começar
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </motion.div>
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
    </>
  );
}
