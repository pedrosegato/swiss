import { useCallback, useRef, useState } from "react";
import { ipc } from "@/lib/ipc";
import { formatSize, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

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
            "group/drop flex flex-col items-center justify-center gap-3 rounded-2xl px-4 py-8 text-center cursor-pointer ring-1 ring-inset transition-all duration-200",
            hasFiles ? "rounded-b-none" : "",
            isDragging
              ? "bg-primary/[0.07] ring-primary/50"
              : "bg-muted/30 ring-border hover:bg-muted/50 hover:ring-primary/30",
          )}
        >
          {label && (
            <span className="text-xs text-muted-foreground tracking-wider font-medium">
              {label}
            </span>
          )}
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/drop:-translate-y-0.5",
              isDragging && "-translate-y-1 scale-110",
            )}
          >
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div className="text-sm">
            {isDragging ? (
              <span className="text-primary font-medium">Solte os arquivos</span>
            ) : (
              <>
                <span className="text-foreground font-medium">
                  Arraste arquivos
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  ou clique para procurar
                </span>
              </>
            )}
          </div>
          {showFormats && !isDragging && (
            <div className="flex items-center flex-wrap justify-center gap-1.5">
              {extensions.map((fmt) => (
                <span
                  key={fmt}
                  className="text-[10px] tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                >
                  {fmt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasFiles && (
        <div className="bg-muted/30 ring-1 ring-inset ring-border rounded-b-2xl overflow-hidden">
          <div className="max-h-[140px] overflow-y-auto divide-y divide-border/50">
            {files.map((f) => (
              <div
                key={f.path}
                className="flex items-center gap-2 px-3 py-2 group"
              >
                <span className="text-[12px] truncate flex-1 text-muted-foreground">
                  {f.name}
                </span>
                <span className="text-[11px] text-muted-foreground/60 shrink-0">
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
            <div className="border-t border-border/50 px-3 py-1.5">
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
