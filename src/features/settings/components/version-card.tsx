import { Download, RefreshCw, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";
import type { BinaryInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBinariesStore } from "@/stores/binaries-store";

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
    <div className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-xl px-3.5 py-3 ring-1">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium">{binary.name}</span>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-[5px] w-[5px] rounded-full",
              binary.downloading
                ? "animate-pulse bg-yellow-500"
                : binary.installed
                  ? "bg-success"
                  : "bg-destructive",
            )}
          />
          <span className="text-muted-foreground text-[10px]">
            {binary.downloading ? "Baixando" : binary.installed ? "Instalado" : "Ausente"}
          </span>
        </div>
      </div>

      <span className="text-muted-foreground/60 truncate text-[10px]">
        {binary.downloading ? "Baixando..." : (binary.version ?? "—")}
      </span>

      <div className="flex items-center gap-1.5">
        {!binary.installed && !binary.downloading && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 px-2.5 text-[11px]"
            onClick={handleInstall}
          >
            <Download className="h-3 w-3" />
            Instalar
          </Button>
        )}
        {binary.installed && !binary.downloading && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex-1 px-2.5 text-[11px]"
              onClick={handleUpdate}
            >
              <RefreshCw className="h-3 w-3" />
              Atualizar
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 px-2 text-[11px]"
                >
                  <Trash2 className="h-3 w-3" />
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
