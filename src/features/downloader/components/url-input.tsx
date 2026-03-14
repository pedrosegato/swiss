import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

interface UrlInputProps {
  onFetch: (url: string) => void;
}

export function UrlInput({ onFetch }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const submit = () => {
    if (!url) return;
    onFetch(url);
    setUrl("");
  };

  return (
    <div className="flex gap-2 mb-3.5">
      <Input
        className="flex-1 font-mono text-xs h-9"
        placeholder="Cole uma URL aqui..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <Button className="text-xs h-9" onClick={submit} disabled={!url}>
        <Download className="w-4 h-4" />
        Baixar
      </Button>
    </div>
  );
}
