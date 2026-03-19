import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";
import { toast } from "sonner";

interface ErrorLogProps {
  message?: string;
  onStopPropagation?: boolean;
}

export function ErrorLog({
  message,
  onStopPropagation = false,
}: ErrorLogProps) {
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
        className="h-5 text-[10.5px] !px-0 gap-1 text-muted-foreground hover:text-foreground !hover:bg-transparent"
        onClick={(e) => {
          if (onStopPropagation) e.stopPropagation();
          setShowLog(!showLog);
        }}
      >
        <Bug className="w-3 h-3" />
        {showLog ? "Ocultar log" : "Ver log"}
      </Button>
      {showLog && message ? (
        <pre
          className="mt-1 text-[10.5px] text-destructive/80 bg-muted/50 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono cursor-pointer hover:bg-muted/70 transition-colors"
          title="Clique para copiar"
          onClick={handleCopy}
        >
          {message}
        </pre>
      ) : null}
    </div>
  );
}
