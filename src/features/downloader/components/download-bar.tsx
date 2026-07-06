import { useState, useRef, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SavePathButton } from "@/components/save-path-button";
import { FormatSelect } from "@/components/format-select";
import { isVideoFormat } from "@/lib/constants";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { validateUrl } from "@/lib/url-validation";
import { Download } from "lucide-react";

interface DownloadBarProps {
  format: string;
  onFormatChange: (format: string) => void;
  quality: string;
  onQualityChange: (quality: string) => void;
  videoFormats: readonly string[];
  audioFormats: readonly string[];
  videoQualities: readonly string[];
  audioQualities: readonly string[];
  onFetch: (url: string) => void;
}

export function DownloadBar({
  format,
  onFormatChange,
  quality,
  onQualityChange,
  videoFormats,
  audioFormats,
  videoQualities,
  audioQualities,
  onFetch,
}: DownloadBarProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isVideo = isVideoFormat(format);
  const qualities = isVideo ? videoQualities : audioQualities;

  const handleFormatChange = (v: string | null) => {
    if (!v) return;
    const wasVideo = isVideoFormat(format);
    const nowVideo = isVideoFormat(v);
    onFormatChange(v);
    if (wasVideo !== nowVideo) {
      const newQualities = nowVideo ? videoQualities : audioQualities;
      onQualityChange(newQualities[0]);
    }
  };

  const submit = (value?: string) => {
    const toValidate = value ?? url;
    if (!toValidate) return;

    const result = validateUrl(toValidate);
    if (!result.valid) {
      setError(result.error ?? "URL inválida");
      return;
    }

    setError(null);
    onFetch(result.url);
    setUrl("");
  };

  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        readText().then((text) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          setUrl(trimmed);
          setError(null);
          inputRef.current?.focus();
        });
        return;
      }

      if (document.activeElement === inputRef.current) return;

      if (e.key === "Enter") {
        submitRef.current();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center">
        <FormatSelect
          value={format}
          onValueChange={handleFormatChange}
          groups={[
            { label: "Vídeo", options: videoFormats },
            { label: "Áudio", options: audioFormats },
          ]}
          triggerClassName="w-[88px] text-xs h-9 shrink-0 rounded-r-none border-r-0 focus:z-10"
        />

        <Select
          value={quality}
          onValueChange={(v: string | null) => v && onQualityChange(v)}
        >
          <SelectTrigger className="w-[92px] text-xs h-9 shrink-0 rounded-none border-l-0 border-r-0 focus:z-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {qualities.map((q) => (
              <SelectItem key={q} value={q}>
                {q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          ref={inputRef}
          className={`flex-1 font-mono text-xs h-9 rounded-none border-l-0 focus:z-10 ${error ? "border-destructive" : ""}`}
          placeholder="Cole uma URL para baixar..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <Button
          className="text-xs h-9 rounded-l-none border-l-0"
          onClick={() => submit()}
          disabled={!url}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <SavePathButton />
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    </div>
  );
}
