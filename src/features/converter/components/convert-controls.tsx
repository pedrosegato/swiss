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
import { FieldLabel } from "@/components/field-label";
import { useConvertStore } from "@/stores/convert-store";
import {
  isVideoFormat,
  CONVERT_VIDEO_FORMATS,
  CONVERT_AUDIO_FORMATS,
  CONVERT_VIDEO_QUALITIES,
  CONVERT_AUDIO_QUALITIES,
} from "@/lib/constants";
import type { ConvertFormat } from "@/lib/types";

export function ConvertControls() {
  const { outputFormat, setOutputFormat, quality, setQuality, clearItems } =
    useConvertStore();

  const qualities = isVideoFormat(outputFormat)
    ? CONVERT_VIDEO_QUALITIES
    : CONVERT_AUDIO_QUALITIES;

  return (
    <div className="flex gap-2.5 items-end mb-7">
      <FieldLabel label="Formato de saída">
        <Select
          value={outputFormat}
          onValueChange={(v) => v && setOutputFormat(v as ConvertFormat)}
        >
          <SelectTrigger className="min-w-[160px] text-xs h-9">
            <SelectValue>{(v: string) => v?.toUpperCase() ?? "—"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Vídeo</SelectLabel>
              {CONVERT_VIDEO_FORMATS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f.toUpperCase()}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Áudio</SelectLabel>
              {CONVERT_AUDIO_FORMATS.map((f) => (
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
        <Select defaultValue="same">
          <SelectTrigger className="min-w-[160px] text-xs h-9">
            <SelectValue>
              {(v: string) => {
                const labels: Record<string, string> = {
                  same: "Mesma pasta",
                  "~/Downloads": "~/Downloads",
                  "~/Videos": "~/Videos",
                  custom: "Outro...",
                };
                return labels[v] ?? v;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="same">Mesma pasta</SelectItem>
            <SelectItem value="~/Downloads">~/Downloads</SelectItem>
            <SelectItem value="~/Videos">~/Videos</SelectItem>
            <SelectItem value="custom">Outro...</SelectItem>
          </SelectContent>
        </Select>
      </FieldLabel>

      <div className="flex-1" />

      <Button variant="outline" className="text-xs h-9" onClick={clearItems}>
        Limpar
      </Button>
      <Button className="text-xs h-9">Converter tudo</Button>
    </div>
  );
}
