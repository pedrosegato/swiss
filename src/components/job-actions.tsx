import { FolderOpen, RefreshCw, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface JobActionsProps {
  isActive: boolean;
  isError: boolean;
  isDone: boolean;
  outputPath?: string;
  onCancel: () => void;
  onRetry: () => void;
  onOpenFolder: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
  openFolderWhenDone?: boolean;
  stopPropagation?: boolean;
}

export function JobActions({
  isActive,
  isError,
  isDone,
  outputPath,
  onCancel,
  onRetry,
  onOpenFolder,
  onRemove,
  showRemove = true,
  openFolderWhenDone = false,
  stopPropagation = false,
}: JobActionsProps) {
  const withStop = (fn?: () => void) => (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    fn?.();
  };

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {isActive && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-5 w-5"
              onClick={withStop(onCancel)}
            >
              <Square className="h-2.5 w-2.5 fill-current" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancelar</TooltipContent>
        </Tooltip>
      )}
      {isError && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-5 w-5"
              onClick={withStop(onRetry)}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tentar novamente</TooltipContent>
        </Tooltip>
      )}
      {isDone && (openFolderWhenDone || outputPath) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-5 w-5"
              onClick={withStop(onOpenFolder)}
            >
              <FolderOpen className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir pasta</TooltipContent>
        </Tooltip>
      )}
      {showRemove && !isActive && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground/30 hover:text-destructive h-5 w-5 transition-colors"
              onClick={withStop(onRemove)}
            >
              <X className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
