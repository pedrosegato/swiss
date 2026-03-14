import { useEffect, useState } from "react";
import { ipc } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

type UpdateStatus = {
  status: "available" | "downloading" | "ready";
  version?: string;
  percent?: number;
};

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    return ipc.onUpdaterStatus((data) => setUpdate(data));
  }, []);

  if (!update) return null;

  return (
    <div className="flex items-center gap-2 ml-auto [-webkit-app-region:no-drag]">
      {update.status === "downloading" ? (
        <span className="text-[10.5px] text-muted-foreground">
          Baixando v{update.version}... {update.percent}%
        </span>
      ) : update.status === "ready" ? (
        <>
          <span className="text-[10.5px] text-muted-foreground">
            v{update.version} pronta
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => ipc.installUpdate()}
          >
            <RefreshCw className="w-3 h-3" />
            Reiniciar
          </Button>
        </>
      ) : (
        <span className="text-[10.5px] text-muted-foreground flex items-center gap-1">
          <Download className="w-3 h-3" />
          v{update.version} disponível
        </span>
      )}
    </div>
  );
}
