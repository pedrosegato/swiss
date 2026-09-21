import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";

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
    <div className="mr-2 flex items-center gap-2 [-webkit-app-region:no-drag]">
      {update.status === "downloading" ? (
        <span className="text-muted-foreground text-[11px]">
          Baixando v{update.version}... {update.percent}%
        </span>
      ) : update.status === "ready" ? (
        <>
          <span className="text-muted-foreground text-[11px]">v{update.version} pronta</span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[11px]"
            onClick={() => ipc.installUpdate()}
          >
            <RefreshCw className="h-3 w-3" />
            Reiniciar
          </Button>
        </>
      ) : (
        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <Download className="h-3 w-3" />v{update.version} disponível
        </span>
      )}
    </div>
  );
}
