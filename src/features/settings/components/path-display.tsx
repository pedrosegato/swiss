import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";

interface PathDisplayProps {
  path: string;
  onChangePath: (newPath: string) => void;
}

export function PathDisplay({ path, onChangePath }: PathDisplayProps) {
  const handleChange = async () => {
    const selected = await ipc.selectFolder();
    if (selected) onChangePath(selected);
  };

  return (
    <div className="font-mono text-[11px] text-secondary-foreground bg-muted/20 border border-border rounded px-2.5 py-1.5 flex items-center justify-between gap-2.5 mt-2">
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
        {path}
      </span>
      <Button
        variant="link"
        size="sm"
        className="text-[10.5px] h-auto p-0"
        onClick={handleChange}
      >
        Alterar
      </Button>
    </div>
  );
}
