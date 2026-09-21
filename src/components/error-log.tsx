import { useState } from "react";
import { Bug } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ErrorLogProps {
  message?: string;
  onStopPropagation?: boolean;
}

export function ErrorLog({ message, onStopPropagation = false }: ErrorLogProps) {
  const [showLog, setShowLog] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    if (onStopPropagation) e.stopPropagation();
    if (!message) return;
    navigator.clipboard.writeText(message);
    toast.success("Log copiado!");
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground !hover:bg-transparent h-5 gap-1 !px-0 text-[11px]"
        onClick={(e) => {
          if (onStopPropagation) e.stopPropagation();
          setShowLog(!showLog);
        }}
      >
        <Bug className="h-3 w-3" />
        {showLog ? "Ocultar log" : "Ver log"}
      </Button>
      {showLog && message ? (
        <pre
          className="text-destructive/80 bg-muted/50 hover:bg-muted/70 mt-1 max-h-32 cursor-pointer overflow-auto rounded p-2 text-[11px] break-all whitespace-pre-wrap transition-colors"
          title="Clique para copiar"
          onClick={handleCopy}
        >
          {message}
        </pre>
      ) : null}
    </div>
  );
}
