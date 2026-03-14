import { useCallback, useRef, useState } from "react";
import { ipc } from "@/lib/ipc";
import { formatSize, cn } from "@/lib/utils";
import { useConvertStore } from "@/stores/convert-store";
import { useSettingsStore } from "@/stores/settings-store";
import { isVideoFormat, CONVERT_ALL_FORMATS } from "@/lib/constants";
import { Dot, Download } from "lucide-react";
import { toast } from "sonner";

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const addItems = useConvertStore((s) => s.addItems);
  const updateItem = useConvertStore((s) => s.updateItem);
  const outputFormat = useConvertStore((s) => s.outputFormat);
  const quality = useConvertStore((s) => s.quality);
  const savePath = useSettingsStore((s) => s.downloadPath);

  const processFiles = useCallback(
    (files: { path: string; name: string; size: number; ext: string }[]) => {
      if (!savePath) {
        toast.warning(
          "Selecione uma pasta de destino antes de adicionar arquivos.",
        );
        return;
      }
      if (files.length === 0) return;

      const items = files.map((f) => {
        const isVideo = isVideoFormat(f.ext.replace(".", ""));
        return {
          id: crypto.randomUUID(),
          inputPath: f.path,
          inputName: f.name,
          inputSize: formatSize(f.size),
          inputExt: f.ext,
          outputFormat,
          quality,
          stage: "queued" as const,
          progress: 0,
          savePath,
          thumbnailLoading: isVideo,
        };
      });
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
    },
    [addItems, updateItem, outputFormat, quality, savePath],
  );

  const handleBrowse = useCallback(async () => {
    if (!savePath) {
      toast.warning(
        "Selecione uma pasta de destino antes de adicionar arquivos.",
      );
      return;
    }
    const files = await ipc.selectFiles([...CONVERT_ALL_FORMATS]);
    if (!files) return;
    processFiles(files);
  }, [savePath, processFiles]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files)
        .filter((f) => {
          const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
          return (CONVERT_ALL_FORMATS as readonly string[]).includes(ext);
        })
        .map((f) => ({
          path: (f as File & { path: string }).path,
          name: f.name,
          size: f.size,
          ext: `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`,
        }));
      processFiles(droppedFiles);
    },
    [processFiles],
  );

  return (
    <div
      className="relative mb-5"
      onDrop={(e) => {
        dragCounter.current = 0;
        setIsDragging(false);
        handleDrop(e);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => {
        e.preventDefault();
        dragCounter.current++;
        if (!isDragging) setIsDragging(true);
      }}
      onDragLeave={() => {
        dragCounter.current--;
        if (dragCounter.current <= 0) {
          dragCounter.current = 0;
          setIsDragging(false);
        }
      }}
    >
      <div
        onClick={handleBrowse}
        className={cn(
          "border-[1.5px] border-dashed rounded-md p-8 text-center transition-colors cursor-pointer space-y-3",
          isDragging
            ? "border-primary/60 bg-primary/5"
            : "border-border hover:border-border-hover",
        )}
      >
        <Download
          className={cn(
            "mx-auto transition-transform duration-200",
            isDragging
              ? "text-primary/60 -translate-y-1"
              : "text-muted-foreground",
          )}
        />
        <div>
          <div className="text-[13px] text-secondary-foreground">
            {isDragging ? (
              <span className="text-primary/80 font-medium">
                Solte para adicionar
              </span>
            ) : (
              <>
                Solte arquivos aqui ou{" "}
                <strong className="text-primary font-medium cursor-pointer">
                  procure
                </strong>
              </>
            )}
          </div>
          {!isDragging && (
            <div className="font-mono text-[10.5px] text-muted-foreground flex items-center flex-wrap justify-center">
              {CONVERT_ALL_FORMATS.map((fmt, i) => (
                <span key={fmt} className="flex items-center">
                  {i > 0 && <Dot className="w-3 h-3" />}
                  {fmt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {isDragging && (
        <div className="absolute inset-0 rounded-md pointer-events-none" />
      )}
    </div>
  );
}
