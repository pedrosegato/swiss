import { FolderOpen, RefreshCw, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface FileActionsProps {
  isConverting: boolean;
  isError: boolean;
  isDone: boolean;
  outputPath?: string;
  onCancel: () => void;
  onRetry: () => void;
  onOpenFolder: () => void;
  onRemove: () => void;
}

export function FileActions({
  isConverting,
  isError,
  isDone,
  outputPath,
  onCancel,
  onRetry,
  onOpenFolder,
  onRemove,
}: FileActionsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {isConverting && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
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
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
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
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onOpenFolder}
            >
              <FolderOpen className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Abrir pasta</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/40 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Remover</TooltipContent>
      </Tooltip>
    </div>
  );
}
