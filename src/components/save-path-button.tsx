import { FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";

interface SavePathButtonProps {
  maxWidthClassName?: string;
  placeholder?: string;
}

export function SavePathButton({
  maxWidthClassName = "max-w-[400px]",
  placeholder = "Selecione uma pasta de destino",
}: SavePathButtonProps) {
  const savePath = useSettingsStore((s) => s.downloadPath);
  const setSavePath = useSettingsStore((s) => s.setDownloadPath);

  const handleSelectFolder = async () => {
    const selected = await ipc.selectFolder();
    if (selected) setSavePath(selected);
  };

  return (
    <Button
      variant="ghost"
      onClick={handleSelectFolder}
      className="text-muted-foreground hover:text-foreground h-auto gap-1.5 text-[11px]"
    >
      <FolderOpen className="h-3 w-3" />
      <span className={cn("truncate", maxWidthClassName)}>{savePath || placeholder}</span>
    </Button>
  );
}
