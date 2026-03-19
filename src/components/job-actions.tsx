import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { FolderOpen, RefreshCw, Square, X } from "lucide-react";

interface JobActionsProps {
  isActive: boolean;
  isError: boolean;
  isDone: boolean;
  outputPath?: string;
  onCancel: () => void;
  onRetry: () => void;
  onOpenFolder: () => void;
  onRemove: () => void;
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
}: JobActionsProps) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {isActive && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              onClick={onCancel}
            >
              <Square className="w-2.5 h-2.5 fill-current" />
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
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={onRetry}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tentar novamente</TooltipContent>
        </Tooltip>
      )}
      {isDone && outputPath && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={onOpenFolder}
            >
              <FolderOpen className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir pasta</TooltipContent>
        </Tooltip>
      )}
      {!isActive && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground/30 hover:text-destructive transition-colors"
              onClick={onRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remover</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
