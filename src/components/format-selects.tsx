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
import { isVideoFormat } from "@/lib/constants";
import { FieldLabel } from "@/components/field-label";
import { useSettingsStore } from "@/stores/settings-store";
import { ipc } from "@/lib/ipc";
import { FolderOpen } from "lucide-react";

interface FormatSelectsProps {
  format: string;
  onFormatChange: (format: string) => void;
  quality?: string;
  onQualityChange?: (quality: string) => void;
  videoFormats: readonly string[];
  audioFormats: readonly string[];
  videoQualities?: readonly string[];
  audioQualities?: readonly string[];
}

export function FormatSelects({
  format,
  onFormatChange,
  quality,
  onQualityChange,
  videoFormats,
  audioFormats,
  videoQualities,
  audioQualities,
}: FormatSelectsProps) {
  const savePath = useSettingsStore((s) => s.downloadPath);
  const setSavePath = useSettingsStore((s) => s.setDownloadPath);
  const isVideo = isVideoFormat(format);
  const showQuality =
    quality !== undefined &&
    onQualityChange &&
    videoQualities &&
    audioQualities;
  const qualities = showQuality
    ? isVideo
      ? videoQualities
      : audioQualities
    : [];

  const handleFormatChange = (v: string | null) => {
    if (!v) return;
    const wasVideo = isVideoFormat(format);
    const nowVideo = isVideoFormat(v);
    onFormatChange(v);
    if (showQuality && wasVideo !== nowVideo) {
      const newQualities = nowVideo ? videoQualities : audioQualities;
      onQualityChange(newQualities[0]);
    }
  };

  const handleSelectFolder = async () => {
    const selected = await ipc.selectFolder();
    if (selected) setSavePath(selected);
  };

  return (
    <div className="flex flex-wrap gap-2.5 mb-7">
      <FieldLabel label="Formato">
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-[140px] text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Vídeo</SelectLabel>
              {videoFormats.map((f) => (
                <SelectItem key={f} value={f}>
                  {f.toUpperCase()}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Áudio</SelectLabel>
              {audioFormats.map((f) => (
                <SelectItem key={f} value={f}>
                  {f.toUpperCase()}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldLabel>

      {showQuality ? (
        <FieldLabel label="Qualidade">
          <Select
            value={quality}
            onValueChange={(v: string | null) => v && onQualityChange?.(v)}
          >
            <SelectTrigger className="w-[130px] text-xs h-9">
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
      ) : null}

      <FieldLabel label="Salvar em" className="flex-1 min-w-[180px]">
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
