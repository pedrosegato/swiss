import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { Play, Trash2 } from "lucide-react";

interface QueueActionsHeaderProps {
  countLabel: ReactNode;
  primaryLabel: string;
  primaryActiveLabel: string;
  isActive: boolean;
  primaryDisabled: boolean;
  onPrimary: () => void;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
  clearTooltip: string;
  onConfirmClear: () => void;
}

export function QueueActionsHeader({
  countLabel,
  primaryLabel,
  primaryActiveLabel,
  isActive,
  primaryDisabled,
  onPrimary,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  clearTooltip,
  onConfirmClear,
}: QueueActionsHeaderProps) {
  return (
    <>
      <Separator />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground tracking-wider font-medium">
          {countLabel}
        </span>
        <div className="flex items-center gap-1">
          <Button
            className={cn("text-[11px] h-7 px-3", isActive && "animate-pulse")}
            onClick={onPrimary}
            disabled={primaryDisabled}
          >
            <Play className="w-3 h-3" />
            {isActive ? primaryActiveLabel : primaryLabel}
          </Button>
          <Tooltip>
            <ConfirmDialog
              trigger={
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
              }
              title={confirmTitle}
              description={confirmDescription}
              confirmLabel={confirmLabel}
              onConfirm={onConfirmClear}
            />
            <TooltipContent>{clearTooltip}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
}
