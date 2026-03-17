import type { BinaryInfo } from "@/lib/types";
import { Card } from "@/components/ui/card";
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
    <Card className="px-3.5 py-3">
      <div className="font-mono text-xs font-medium mb-1">{binary.name}</div>
      <div className="font-mono text-[10.5px] text-muted-foreground mb-1.5">
        {binary.downloading
          ? "Baixando..."
          : (binary.version ?? "Não encontrado")}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "w-[5px] h-[5px] rounded-full",
              binary.downloading
                ? "bg-yellow-500 animate-pulse"
                : binary.installed
                  ? "bg-success"
                  : "bg-primary",
            )}
          />
          <span className="text-[10px] text-muted-foreground">
            {binary.downloading
              ? "Baixando"
              : binary.installed
                ? "Instalado"
                : "Ausente"}
          </span>
        </div>
        {!binary.installed && !binary.downloading ? (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={handleInstall}
          >
            <Download className="w-3 h-3" />
            Instalar
          </Button>
        ) : null}
        {binary.installed && !binary.downloading ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
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
                  className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                  Remover
                </Button>
              }
              title={`Remover ${binary.name}?`}
              description={`${binary.name} será desinstalado. Downloads e conversões não funcionarão sem este binário.`}
              confirmLabel="Remover"
              onConfirm={handleUninstall}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
