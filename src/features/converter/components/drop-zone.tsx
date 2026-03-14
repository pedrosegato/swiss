import { useCallback } from "react";
import { ipc } from "@/lib/ipc";
import { formatSize } from "@/lib/utils";
import { useConvertStore } from "@/stores/convert-store";
import { useSettingsStore } from "@/stores/settings-store";
import { isVideoFormat, CONVERT_ALL_FORMATS } from "@/lib/constants";
import { Dot, Download } from "lucide-react";

export function DropZone() {
  const addItems = useConvertStore((s) => s.addItems);
  const updateItem = useConvertStore((s) => s.updateItem);
  const outputFormat = useConvertStore((s) => s.outputFormat);
  const quality = useConvertStore((s) => s.quality);
  const savePath = useSettingsStore((s) => s.downloadPath);

  const handleBrowse = useCallback(async () => {
    if (!savePath) return;
    const files = await ipc.selectFiles([...CONVERT_ALL_FORMATS]);
    if (!files) return;

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
  }, [addItems, updateItem, outputFormat, quality, savePath]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        return (CONVERT_ALL_FORMATS as readonly string[]).includes(ext);
      });
      if (droppedFiles.length === 0 || !savePath) return;

      const items = droppedFiles.map((f) => {
        const ext = `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`;
        const isVideo = isVideoFormat(ext.replace(".", ""));
        return {
          id: crypto.randomUUID(),
          inputPath: (f as File & { path: string }).path,
          inputName: f.name,
          inputSize: formatSize(f.size),
          inputExt: ext,
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

  return (
    <div
      onClick={handleBrowse}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-[1.5px] border-dashed border-border rounded-md p-8 text-center mb-5 transition-all cursor-pointer hover:border-primary hover:bg-primary/10 space-y-3"
    >
      <Download className="text-muted-foreground mx-auto" />
      <div>
        <div className="text-[13px] text-secondary-foreground">
          Solte arquivos aqui ou{" "}
          <strong className="text-primary font-medium cursor-pointer">
            procure
          </strong>
        </div>
        <div className="font-mono text-[10.5px] text-muted-foreground flex items-center flex-wrap justify-center">
          {CONVERT_ALL_FORMATS.map((fmt, i) => (
            <span key={fmt} className="flex items-center">
              {i > 0 && <Dot className="w-3 h-3" />}
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
