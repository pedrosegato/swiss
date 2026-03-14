import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDownloadStore } from "@/stores/download-store";
import type { SortOption } from "@/lib/types";
import { Dot, Trash2 } from "lucide-react";

export function QueueHeader() {
  const itemCount = useDownloadStore((s) => s.items.length);
  const activeCount = useDownloadStore(
    (s) =>
      s.items.filter(
        (i) => i.stage === "downloading" || i.stage === "converting",
      ).length,
  );
  const sortBy = useDownloadStore((s) => s.sortBy);
  const setSortBy = useDownloadStore((s) => s.setSortBy);
  const clearItems = useDownloadStore((s) => s.clearItems);

  return (
    <div className="flex items-center justify-between mb-3.5">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
        Fila
      </span>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[10px] text-muted-foreground">
          {itemCount} itens <Dot className="w-3 h-3 inline" /> {activeCount}{" "}
          ativos
        </span>
        {itemCount > 0 && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Limpar histórico</TooltipContent>
            </Tooltip>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[14px]">
                  Limpar histórico?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[12px]">
                  Todos os downloads da fila serão removidos. Downloads ativos
                  serão cancelados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel size="sm">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  size="sm"
                  variant="destructive"
                  onClick={clearItems}
                >
                  Limpar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
        >
          <SelectTrigger className="h-7 text-[11px] w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigos</SelectItem>
            <SelectItem value="largest">Maior tamanho</SelectItem>
            <SelectItem value="smallest">Menor tamanho</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
