import type { BinaryInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ipc } from "@/lib/ipc";
import { useBinariesStore } from "@/stores/binaries-store";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Download, Trash2, RefreshCw } from "lucide-react";

interface VersionCardProps {
  binary: BinaryInfo;
}

export function VersionCard({ binary }: VersionCardProps) {
  const setYtdlp = useBinariesStore((s) => s.setYtdlp);
  const setFfmpeg = useBinariesStore((s) => s.setFfmpeg);
  const setFfprobe = useBinariesStore((s) => s.setFfprobe);

  const getSetter = () => {
    if (binary.name === "yt-dlp") return setYtdlp;
    if (binary.name === "ffprobe") return setFfprobe;
    return setFfmpeg;
  };

  const handleUpdate = async () => {
    const name = binary.name as "yt-dlp" | "ffmpeg" | "ffprobe";
    const setter = getSetter();
    setter({ ...binary, downloading: true });
    const result = await ipc.updateBinary(name);
    setter({
      name: binary.name,
      version: result.version,
      installed: result.success,
      path: result.path,
      source: result.source,
      downloading: false,
    });
  };

  const handleUninstall = async () => {
    const name = binary.name as "yt-dlp" | "ffmpeg" | "ffprobe";
    const setter = getSetter();
    const result = await ipc.uninstallBinary(name);
    setter({
      name: binary.name,
      version: result.version,
      installed: result.installed,
      path: result.path,
      source: result.source,
      downloading: false,
    });
  };

  const handleInstall = async () => {
    const name = binary.name as "yt-dlp" | "ffmpeg" | "ffprobe";
    const setter = getSetter();
    setter({ ...binary, downloading: true });
    const result = await ipc.installBinary(name);
    setter({
      name: binary.name,
      version: result.version,
      installed: result.success,
      path: result.path,
      source: result.source,
      downloading: false,
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium">{binary.name}</span>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "w-[5px] h-[5px] rounded-full",
              binary.downloading
                ? "bg-yellow-500 animate-pulse"
                : binary.installed
                  ? "bg-success"
                  : "bg-destructive",
            )}
          />
          <span className="text-[9px] text-muted-foreground">
            {binary.downloading
              ? "Baixando"
              : binary.installed
                ? "Instalado"
                : "Ausente"}
          </span>
        </div>
      </div>

      <span className="font-mono text-[9px] text-muted-foreground/60 truncate">
        {binary.downloading
          ? "Baixando..."
          : (binary.version ?? "—")}
      </span>

      <div className="flex items-center gap-1.5">
        {!binary.installed && !binary.downloading && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2 flex-1"
            onClick={handleInstall}
          >
            <Download className="w-3 h-3" />
            Instalar
          </Button>
        )}
        {binary.installed && !binary.downloading && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2 flex-1"
              onClick={handleUpdate}
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              }
              title={`Remover ${binary.name}?`}
              description={`${binary.name} será desinstalado. Downloads e conversões não funcionarão sem este binário.`}
              confirmLabel="Remover"
              onConfirm={handleUninstall}
            />
          </>
        )}
      </div>
    </div>
  );
}
