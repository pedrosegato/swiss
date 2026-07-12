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

interface PrimaryAction {
  label: string;
  activeLabel: string;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
}

interface ClearAction {
  title: string;
  description: string;
  confirmLabel: string;
  tooltip: string;
  onConfirm: () => void;
}

interface QueueBarProps {
  countLabel: ReactNode;
  primary?: PrimaryAction;
  clear?: ClearAction;
  children?: ReactNode;
}

export function QueueBar({ countLabel, primary, clear, children }: QueueBarProps) {
  return (
    <>
      <Separator />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground tracking-wider font-medium">
          {countLabel}
        </span>
        <div className="flex items-center gap-2">
          {children}
          {primary && (
            <Button
              className={cn(
                "h-8 gap-1.5 px-3.5 text-[12px]",
                primary.isActive && "animate-pulse",
              )}
              onClick={primary.onClick}
              disabled={primary.disabled}
            >
              <Play className="w-3 h-3" />
              {primary.isActive ? primary.activeLabel : primary.label}
            </Button>
          )}
          {clear && (
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
                title={clear.title}
                description={clear.description}
                confirmLabel={clear.confirmLabel}
                onConfirm={clear.onConfirm}
              />
              <TooltipContent>{clear.tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
}
