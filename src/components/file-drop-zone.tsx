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

  const hasFiles = files && files.length > 0;

  return (
    <div className={cn("min-w-0 w-full", className)}>
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
            "flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-4 py-7 text-center cursor-pointer transition-all duration-200",
            hasFiles ? "rounded-b-none border-b-0 pb-5" : "",
            isDragging
              ? "border-primary/60 bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-primary/[0.03]",
          )}
        >
          {label && (
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {label}
            </span>
          )}
          <Download
            className={cn(
              "w-6 h-6 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              isDragging ? "text-primary -translate-y-1" : "text-muted-foreground",
            )}
          />
          <div className="text-sm text-secondary-foreground">
            {isDragging ? (
              <span className="text-primary font-medium">Solte aqui</span>
            ) : (
              <>
                Solte arquivos ou{" "}
                <strong className="text-primary font-medium">procure</strong>
              </>
            )}
          </div>
          {showFormats && !isDragging && (
            <div className="font-mono text-[11px] text-muted-foreground flex items-center flex-wrap justify-center">
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

      {hasFiles && (
        <div className="border-[1.5px] border-dashed border-t-0 border-border rounded-b-2xl">
          <div className="max-h-[140px] overflow-y-auto">
            {files.map((f) => (
              <div
                key={f.path}
                className="flex items-center gap-2 px-3 py-2 group border-t border-border/40 first:border-t-0"
              >
                <span className="text-[12px] truncate flex-1 text-muted-foreground">
                  {f.name}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground/60 shrink-0">
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
          {onClear && files.length > 1 && (
            <div className="border-t border-border/40 px-3 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-0 text-[11px] text-muted-foreground/60 hover:text-destructive"
                onClick={onClear}
              >
                Limpar todos
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
