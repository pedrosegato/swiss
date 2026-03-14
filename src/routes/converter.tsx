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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropZone } from "@/features/converter/components/drop-zone";
import { FormatSelects } from "@/components/format-selects";
import { FileRow } from "@/features/converter/components/file-row";
import { useConvertStore } from "@/stores/convert-store";
import { CONVERT_VIDEO_FORMATS, CONVERT_AUDIO_FORMATS } from "@/lib/constants";
import type { ConvertFormat } from "@/lib/types";
import { FileAudio, Trash2 } from "lucide-react";

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

      <Separator className="mb-5" />

      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
          {itemCount} {itemCount === 1 ? "arquivo" : "arquivos"}
        </span>
        <div className="flex items-center gap-2">
          {itemCount > 0 && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Limpar arquivos</TooltipContent>
              </Tooltip>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[14px]">
                    Limpar arquivos?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[12px]">
                    Todos os arquivos da lista serão removidos. Conversões
                    ativas serão canceladas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    size="sm"
                    variant="destructive"
                    onClick={clearItems}
                  >
                    Limpar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button className="text-xs h-7" onClick={startAll}>
            Converter tudo
          </Button>
        </div>
      </div>

      {itemIds.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <FileAudio className="w-8 h-8 mb-3 text-muted-foreground/40" />
          </motion.div>
          <p className="text-[13px]">Nenhum arquivo adicionado</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            Arraste arquivos ou clique na área acima
          </p>
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
