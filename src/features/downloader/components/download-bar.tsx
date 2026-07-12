import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SavePathButton } from "@/components/save-path-button";
import { PillSelect } from "@/components/pill-select";
import { isVideoFormat } from "@/lib/constants";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { validateUrl } from "@/lib/url-validation";
import { cn } from "@/lib/utils";
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
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
          <Input
            ref={inputRef}
            className={cn(
              "h-12 rounded-2xl bg-transparent pl-11 pr-4 text-sm",
              error && "border-destructive",
            )}
            placeholder="Cole um link para baixar…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <Button
          className="h-12 gap-1.5 rounded-2xl px-5 font-medium"
          onClick={() => submit()}
          disabled={!url}
        >
          <Download className="w-4 h-4" />
          Baixar
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <PillSelect
          value={format}
          onValueChange={handleFormatChange}
          groups={[
            { label: "Vídeo", options: videoFormats },
            { label: "Áudio", options: audioFormats },
          ]}
          uppercaseItems
        />
        <PillSelect
          value={quality}
          onValueChange={(v) => v && onQualityChange(v)}
          options={qualities}
        />

        <div className="ml-auto flex items-center gap-2">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <SavePathButton />
        </div>
      </div>
    </div>
  );
}
