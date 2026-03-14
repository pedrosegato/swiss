import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { DropZone } from "@/features/converter/components/drop-zone";
import { ConvertControls } from "@/features/converter/components/convert-controls";
import { FileRow } from "@/features/converter/components/file-row";
import { useConvertStore } from "@/stores/convert-store";

export const Route = createFileRoute("/converter")({
  component: ConverterPage,
});

function ConverterPage() {
  const items = useConvertStore((s) => s.items);

  return (
    <>
      <div className="flex items-baseline gap-3 mb-5">
        <h1 className="text-lg font-semibold tracking-tight">Converter</h1>
        <span className="text-xs text-muted-foreground font-light">
          Converta uma mídia para um formato desejado
        </span>
      </div>

      <DropZone />
      <ConvertControls />

      <Separator className="mb-5" />

      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
          Arquivos
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {items.length} {items.length === 1 ? "arquivo" : "arquivos"}
        </span>
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
