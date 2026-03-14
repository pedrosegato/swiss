import { Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";

export function WindowControls() {
  if (ipc.platform === "darwin") return null;

  return (
    <div className="flex items-center ml-auto [-webkit-app-region:no-drag]">
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-none text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        onClick={() => ipc.minimizeWindow()}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-none text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        onClick={() => ipc.maximizeWindow()}
      >
        <Square className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-none text-muted-foreground hover:!bg-destructive hover:!text-destructive-foreground"
        onClick={() => ipc.closeWindow()}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
