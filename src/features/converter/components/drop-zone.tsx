import { useCallback } from "react";
import { ipc } from "@/lib/ipc";
import { formatSize } from "@/lib/utils";
import { useConvertStore } from "@/stores/convert-store";
import { Download } from "lucide-react";

export function DropZone() {
  const { addItems, outputFormat, quality, savePath } = useConvertStore();

  const handleBrowse = useCallback(async () => {
    const files = await ipc.selectFiles([
      "mp4",
      "mkv",
      "avi",
      "mov",
      "mp3",
      "wav",
      "flac",
      "wma",
    ]);
    if (!files) return;

    const items = files.map((f) => ({
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
    }));
    addItems(items);
  }, [addItems, outputFormat, quality, savePath]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // TODO: Handle dropped files via IPC to get file info
  }, []);

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
        <div className="font-mono text-[10.5px] text-muted-foreground">
          mp4 · mkv · avi · mov · mp3 · wav · flac · wma
        </div>
      </div>
    </div>
  );
}
