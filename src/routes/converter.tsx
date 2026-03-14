import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { DropZone } from "@/features/converter/components/drop-zone";
import { FormatSelects } from "@/components/format-selects";
import { FileRow } from "@/features/converter/components/file-row";
import { useConvertStore } from "@/stores/convert-store";
import { CONVERT_VIDEO_FORMATS, CONVERT_AUDIO_FORMATS } from "@/lib/constants";
import type { ConvertFormat } from "@/lib/types";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/converter")({
  component: ConverterPage,
});

function ConverterPage() {
  const items = useConvertStore((s) => s.items);
  const clearItems = useConvertStore((s) => s.clearItems);
  const startAll = useConvertStore((s) => s.startAll);
  const format = useConvertStore((s) => s.outputFormat);
  const setFormat = useConvertStore((s) => s.setOutputFormat);
  return (
    <>
      <div className="flex items-baseline gap-3 mb-5">
        <h1 className="text-lg font-semibold tracking-tight">Converter</h1>
        <span className="text-xs text-muted-foreground font-light">
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
          {items.length} {items.length === 1 ? "arquivo" : "arquivos"}
        </span>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={clearItems}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpar arquivos</TooltipContent>
            </Tooltip>
          )}
          <Button className="text-xs h-7" onClick={startAll}>
            Converter tudo
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <table
          className="w-full border-collapse"
          style={{ borderSpacing: "0 3px" }}
        >
          <tbody>
            {items.map((item) => (
              <FileRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
