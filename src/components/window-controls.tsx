import { Minus, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";

export function WindowControls() {
  if (ipc.platform === "darwin") return null;

  return (
    <div className="ml-auto flex items-center [-webkit-app-region:no-drag]">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-muted/60 hover:text-foreground h-12 w-12 rounded-none"
        onClick={() => ipc.minimizeWindow()}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-muted/60 hover:text-foreground h-12 w-12 rounded-none"
        onClick={() => ipc.maximizeWindow()}
      >
        <Square className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:!bg-destructive hover:!text-destructive-foreground h-12 w-12 rounded-none"
        onClick={() => ipc.closeWindow()}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
