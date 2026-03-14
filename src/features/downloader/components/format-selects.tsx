import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  isVideoFormat,
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  VIDEO_QUALITIES,
  AUDIO_QUALITIES,
} from "@/lib/constants";
import { useDownloadStore } from "@/stores/download-store";
import { FieldLabel } from "@/components/field-label";
import { ipc } from "@/lib/ipc";
import type { DownloadFormat } from "@/lib/types";
import { FolderOpen } from "lucide-react";

export function FormatSelects() {
  const format = useDownloadStore((s) => s.selectedFormat);
  const setFormat = useDownloadStore((s) => s.setSelectedFormat);
  const quality = useDownloadStore((s) => s.selectedQuality);
  const setQuality = useDownloadStore((s) => s.setSelectedQuality);
  const savePath = useDownloadStore((s) => s.selectedSavePath);
  const setSavePath = useDownloadStore((s) => s.setSelectedSavePath);

  const qualities = isVideoFormat(format) ? VIDEO_QUALITIES : AUDIO_QUALITIES;

  const handleSelectFolder = async () => {
    const selected = await ipc.selectFolder();
    if (selected) setSavePath(selected);
  };

  return (
    <div className="flex gap-2.5 mb-7">
      <FieldLabel label="Formato">
        <Select
          value={format}
          onValueChange={(v) => {
            if (!v) return;
            const wasVideo = isVideoFormat(format);
            const nowVideo = isVideoFormat(v);
            setFormat(v as DownloadFormat);
            if (wasVideo !== nowVideo) setQuality("Máxima");
          }}
        >
          <SelectTrigger className="min-w-[160px] text-xs h-9">
            <SelectValue>{(v: string) => v?.toUpperCase() ?? "—"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Vídeo</SelectLabel>
              {VIDEO_FORMATS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f.toUpperCase()}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Áudio</SelectLabel>
              {AUDIO_FORMATS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f.toUpperCase()}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldLabel>

      <FieldLabel label="Qualidade">
        <Select value={quality} onValueChange={(v) => v && setQuality(v)}>
          <SelectTrigger className="min-w-[140px] text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {qualities.map((q) => (
              <SelectItem key={q} value={q}>
                {q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldLabel>

      <FieldLabel label="Salvar em">
        <div className="flex items-center h-9">
          <div className="flex-1 min-w-0 h-full flex items-center border border-r-0 rounded-l-md bg-transparent px-3 text-xs text-muted-foreground truncate">
            {savePath}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-l-none shrink-0"
            onClick={handleSelectFolder}
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </Button>
        </div>
      </FieldLabel>
    </div>
  );
}
