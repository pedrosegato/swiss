import { useShallow } from "zustand/shallow";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DropZone } from "@/features/converter/components/drop-zone";
import { FormatSelects } from "@/components/format-selects";
import { FileRow } from "@/features/converter/components/file-row";
import { useConvertStore } from "@/stores/convert-store";
import { CONVERT_VIDEO_FORMATS, CONVERT_AUDIO_FORMATS } from "@/lib/constants";
import type { ConvertFormat } from "@/lib/types";
import { FileAudio, Trash2 } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
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
  const format = useConvertStore((s) => s.outputFormat);
  const setFormat = useConvertStore((s) => s.setOutputFormat);
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

  return (
    <>
      <div className="flex items-baseline gap-3 mb-5 flex-wrap">
        <h1 className="text-lg font-semibold tracking-tight">Converter</h1>
        <span className="text-xs text-muted-foreground font-light hidden sm:inline">
          Converta uma mídia para um formato desejado
        </span>
      </div>

      <DropZone />
      <FormatSelects
        format={format}
        onFormatChange={(v) => setFormat(v as ConvertFormat)}
        videoFormats={CONVERT_VIDEO_FORMATS}
        audioFormats={CONVERT_AUDIO_FORMATS}
      />

      {itemCount > 0 && <Separator className="mb-5" />}

      {itemCount > 0 && (
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            {itemCount} {itemCount === 1 ? "arquivo" : "arquivos"}
          </span>
          <div className="flex items-center gap-2">
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
                title="Limpar arquivos?"
                description="Todos os arquivos da lista serão removidos. Conversões ativas serão canceladas."
                confirmLabel="Limpar"
                onConfirm={clearItems}
              />
              <TooltipContent>Limpar arquivos</TooltipContent>
            </Tooltip>
            <Button
              className="text-xs h-7"
              onClick={handleStartAll}
              disabled={!hasQueued || isConverting}
            >
              {isConverting ? "Convertendo..." : "Converter tudo"}
            </Button>
          </div>
        </div>
      )}

      {itemIds.length === 0 ? (
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
                  <FileAudio className="w-8 h-8 text-muted-foreground" />
                </motion.div>
              </EmptyMedia>
              <EmptyTitle className="text-[14px]">
                Nenhum arquivo adicionado
              </EmptyTitle>
              <EmptyDescription className="text-[12px]">
                Arraste arquivos ou clique na área acima
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </motion.div>
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
    </>
  );
}
