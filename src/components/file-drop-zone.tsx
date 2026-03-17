import { useCallback, useRef, useState } from "react";
import { ipc } from "@/lib/ipc";
import { formatSize, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dot, Download, X } from "lucide-react";

interface FileEntry {
  path: string;
  name: string;
  size: number;
}

interface FileDropZoneProps {
  extensions: readonly string[];
  label?: string;
  showFormats?: boolean;
  files?: FileEntry[];
  onAddFiles?: (files: FileEntry[]) => void;
  onRemoveFile?: (path: string) => void;
  onClear?: () => void;
  onDrop?: (
    files: { path: string; name: string; size: number; ext: string }[],
  ) => void;
  className?: string;
}

export function FileDropZone({
  extensions,
  label,
  showFormats,
  files,
  onAddFiles,
  onRemoveFile,
  onClear,
  onDrop,
  className,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const processDropped = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = Array.from(e.dataTransfer.files)
        .filter((f) => {
          const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
          return extensions.includes(ext);
        })
        .map((f) => ({
          path: (f as File & { path: string }).path,
          name: f.name,
          size: f.size,
          ext: `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`,
        }));

      if (onDrop) {
        onDrop(dropped);
      } else if (onAddFiles) {
        onAddFiles(dropped);
      }
    },
    [extensions, onDrop, onAddFiles],
  );

  const handleBrowse = useCallback(async () => {
    const selected = await ipc.selectFiles([...extensions]);
    if (!selected) return;

    if (onDrop) {
      onDrop(
        selected.map((f) => ({
          path: f.path,
          name: f.name,
          size: f.size,
          ext: f.ext,
        })),
      );
    } else if (onAddFiles) {
      onAddFiles(
        selected.map((f) => ({ path: f.path, name: f.name, size: f.size })),
      );
    }
  }, [extensions, onDrop, onAddFiles]);

  return (
    <div className={cn("min-w-0 w-full", className)}>
      {(label || (files && files.length > 0)) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              {label}
            </span>
          )}
          {files && files.length > 0 && onClear && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
              onClick={onClear}
            >
              Limpar
            </Button>
          )}
        </div>
      )}

      <div
        onDrop={(e) => {
          dragCounter.current = 0;
          setIsDragging(false);
          processDropped(e);
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
            "border-[1.5px] border-dashed rounded-md p-6 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-primary/60 bg-primary/5"
              : "border-border hover:border-border-hover",
          )}
        >
          <Download
            className={cn(
              "mx-auto mb-2 w-5 h-5 transition-transform duration-200",
              isDragging
                ? "text-primary/60 -translate-y-1"
                : "text-muted-foreground",
            )}
          />
          <div className="text-[12px] text-secondary-foreground">
            {isDragging ? (
              <span className="text-primary/80 font-medium">Solte aqui</span>
            ) : (
              <>
                Solte arquivos aqui ou{" "}
                <strong className="text-primary font-medium cursor-pointer">
                  procure
                </strong>
              </>
            )}
          </div>
          {showFormats && !isDragging && (
            <div className="font-mono text-[10.5px] text-muted-foreground flex items-center flex-wrap justify-center mt-1">
              {extensions.map((fmt, i) => (
                <span key={fmt} className="flex items-center">
                  {i > 0 && <Dot className="w-3 h-3" />}
                  {fmt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {files && files.length > 0 && (
        <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
          {files.map((f) => (
            <div
              key={f.path}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/40 group"
            >
              <span className="text-[11px] truncate flex-1">{f.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                {formatSize(f.size)}
              </span>
              {onRemoveFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveFile(f.path)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
