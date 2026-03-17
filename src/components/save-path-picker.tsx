import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";
import { ipc } from "@/lib/ipc";
import { FolderOpen } from "lucide-react";

export function SavePathPicker() {
  const savePath = useSettingsStore((s) => s.downloadPath);
  const setSavePath = useSettingsStore((s) => s.setDownloadPath);

  const handleSelect = async () => {
    const selected = await ipc.selectFolder();
    if (selected) setSavePath(selected);
  };

  return (
    <div className="flex items-center h-9">
      <div className="flex-1 min-w-0 h-full flex items-center border border-r-0 rounded-l-md bg-transparent px-3 text-xs text-muted-foreground truncate">
        {savePath || "Selecione uma pasta"}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-l-none shrink-0"
        onClick={handleSelect}
      >
        <FolderOpen className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
