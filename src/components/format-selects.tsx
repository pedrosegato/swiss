import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isVideoFormat } from "@/lib/constants";
import { FieldLabel } from "@/components/field-label";
import { SavePathPicker } from "@/components/save-path-picker";

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
        <SavePathPicker />
      </FieldLabel>
    </div>
  );
}
