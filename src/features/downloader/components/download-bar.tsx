import { useState, useRef, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settings-store";
import { isVideoFormat } from "@/lib/constants";
import { ipc } from "@/lib/ipc";
import { validateUrl } from "@/lib/url-validation";
import { Download, FolderOpen } from "lucide-react";

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
  const savePath = useSettingsStore((s) => s.downloadPath);
  const setSavePath = useSettingsStore((s) => s.setDownloadPath);

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

  const handleSelectFolder = async () => {
    const selected = await ipc.selectFolder();
    if (selected) setSavePath(selected);
  };

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          setUrl(trimmed);
          setError(null);
          inputRef.current?.focus();
        });
        return;
      }

      if (e.key === "Enter") {
        submit();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [url]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center">
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-[88px] text-xs h-9 shrink-0 rounded-r-none border-r-0 focus:z-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
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
        <Button
          variant="ghost"
          onClick={handleSelectFolder}
          className="h-auto gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="w-3 h-3" />
          <span className="font-mono truncate max-w-[400px]">
            {savePath || "Selecione uma pasta de destino"}
          </span>
        </Button>
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    </div>
  );
}
