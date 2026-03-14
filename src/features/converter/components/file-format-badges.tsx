import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONVERT_VIDEO_FORMATS, CONVERT_AUDIO_FORMATS } from "@/lib/constants";
import type { ConvertFormat } from "@/lib/types";

interface FileFormatBadgesProps {
  inputExt: string;
  outputFormat: string;
  isQueued: boolean;
  onOutputFormatChange: (format: ConvertFormat) => void;
}

export function FileFormatBadges({
  inputExt,
  outputFormat,
  isQueued,
  onOutputFormatChange,
}: FileFormatBadgesProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="font-mono text-[10px] text-muted-foreground"
      >
        .{inputExt}
      </Badge>
      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
      {isQueued ? (
        <Select
          value={outputFormat}
          onValueChange={(v) => onOutputFormatChange(v as ConvertFormat)}
        >
          <SelectTrigger className="h-6 text-[10px] font-mono w-[80px] px-2">
            <SelectValue />
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
      ) : (
        <Badge variant="outline" className="font-mono text-[10px]">
          .{outputFormat}
        </Badge>
      )}
    </div>
  );
}
