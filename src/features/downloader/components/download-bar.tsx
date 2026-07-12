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
import { Download, Link2 } from "lucide-react";

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
    <div className="flex flex-col gap-3">
      <div
        className={`flex items-center gap-2.5 h-12 rounded-2xl border bg-card px-3.5 transition-all duration-200 focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10 ${error ? "border-destructive" : "border-input"}`}
      >
        <Link2 className="w-5 h-5 shrink-0 text-primary" />
        <Input
          ref={inputRef}
          className="flex-1 h-full border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          placeholder="Cole um link para baixar…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button
          className="h-9 gap-1.5 rounded-xl px-4 font-medium transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 active:translate-y-0"
          onClick={() => submit()}
          disabled={!url}
        >
          <Download className="w-4 h-4" />
          Baixar
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <FormatSelect
          value={format}
          onValueChange={handleFormatChange}
          groups={[
            { label: "Vídeo", options: videoFormats },
            { label: "Áudio", options: audioFormats },
          ]}
          triggerClassName="w-auto min-w-[84px] text-xs h-9 rounded-full gap-1.5"
        />

        <Select
          value={quality}
          onValueChange={(v: string | null) => v && onQualityChange(v)}
        >
          <SelectTrigger className="w-auto min-w-[88px] text-xs h-9 rounded-full gap-1.5">
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

        <div className="ml-auto flex items-center gap-2">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <SavePathButton />
        </div>
      </div>
    </div>
  );
}
