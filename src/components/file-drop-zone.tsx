import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";
import { cn, formatSize } from "@/lib/utils";

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
  onDrop?: (files: { path: string; name: string; size: number; ext: string }[]) => void;
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
      onAddFiles(selected.map((f) => ({ path: f.path, name: f.name, size: f.size })));
    }
  }, [extensions, onDrop, onAddFiles]);

  const hasFiles = files && files.length > 0;

  return (
    <div className={cn("w-full min-w-0", className)}>
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
            "group/drop flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl px-4 py-8 text-center ring-1 transition-all duration-200 ring-inset",
            hasFiles ? "rounded-b-none" : "",
            isDragging
              ? "bg-primary/[0.07] ring-primary/50"
              : "bg-muted/30 ring-border hover:bg-muted/50 hover:ring-primary/30",
          )}
        >
          {label && (
            <span className="text-muted-foreground text-xs font-medium tracking-wider">
              {label}
            </span>
          )}
          <div
            className={cn(
              "bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/drop:-translate-y-0.5",
              isDragging && "-translate-y-1 scale-110",
            )}
          >
            <Upload className="text-primary h-5 w-5" />
          </div>
          <div className="text-sm">
            {isDragging ? (
              <span className="text-primary font-medium">Solte os arquivos</span>
            ) : (
              <>
                <span className="text-foreground font-medium">Arraste arquivos</span>
                <span className="text-muted-foreground"> ou clique para procurar</span>
              </>
            )}
          </div>
          {showFormats && !isDragging && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {extensions.map((fmt) => (
                <span
                  key={fmt}
                  className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-[10px] tracking-wide"
                >
                  {fmt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasFiles && (
        <div className="bg-muted/30 ring-border overflow-hidden rounded-b-2xl ring-1 ring-inset">
          <div className="divide-border/50 max-h-[140px] divide-y overflow-y-auto">
            {files.map((f) => (
              <div key={f.path} className="group flex items-center gap-2 px-3 py-2">
                <span className="text-muted-foreground flex-1 truncate text-[12px]">{f.name}</span>
                <span className="text-muted-foreground/60 shrink-0 text-[11px]">
                  {formatSize(f.size)}
                </span>
                {onRemoveFile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => onRemoveFile(f.path)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {onClear && files.length > 1 && (
            <div className="border-border/50 border-t px-3 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground/60 hover:text-destructive h-5 px-0 text-[11px]"
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
