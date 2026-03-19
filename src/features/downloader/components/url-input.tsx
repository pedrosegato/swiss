import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { validateUrl } from "@/lib/url-validation";

interface UrlInputProps {
  onFetch: (url: string) => void;
}

export function UrlInput({ onFetch }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="mb-3.5">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          className={`flex-1 font-mono text-xs h-9 ${error ? "border-destructive" : ""}`}
          placeholder="Insira uma URL..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button
          className="text-xs h-9"
          onClick={() => submit()}
          disabled={!url}
        >
          <Download className="w-4 h-4" />
          Baixar
        </Button>
      </div>
      {error && (
        <p className="text-[11px] text-destructive mt-1.5 ml-0.5">{error}</p>
      )}
    </div>
  );
}
