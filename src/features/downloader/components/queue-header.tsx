import { Dot } from "lucide-react";

import { pillTriggerClass } from "@/components/pill-select";
import { QueueBar } from "@/components/queue-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDownloadStore } from "@/stores/download-store";

export function QueueHeader() {
  const itemCount = useDownloadStore((s) => s.items.length);
  const activeCount = useDownloadStore(
    (s) => s.items.filter((i) => i.stage === "downloading" || i.stage === "converting").length,
  );
  const sortBy = useDownloadStore((s) => s.sortBy);
  const setSortBy = useDownloadStore((s) => s.setSortBy);
  const clearItems = useDownloadStore((s) => s.clearItems);

  return (
    <QueueBar
      countLabel={
        <>
          {itemCount} {itemCount === 1 ? "item" : "itens"} <Dot className="inline h-3 w-3" />{" "}
          {activeCount} ativos
        </>
      }
      clear={{
        title: "Limpar histórico?",
        description:
          "Todos os downloads da fila serão removidos. Downloads ativos serão cancelados.",
        confirmLabel: "Limpar",
        tooltip: "Limpar histórico",
        onConfirm: clearItems,
      }}
    >
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
        <SelectTrigger className={cn(pillTriggerClass, "min-w-[130px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Mais recentes</SelectItem>
          <SelectItem value="oldest">Mais antigos</SelectItem>
          <SelectItem value="largest">Maior tamanho</SelectItem>
          <SelectItem value="smallest">Menor tamanho</SelectItem>
        </SelectContent>
      </Select>
    </QueueBar>
  );
}
