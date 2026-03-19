import { createFileRoute } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";
import { useBinariesStore } from "@/stores/binaries-store";
import { VersionCard } from "@/features/settings/components/version-card";
import { ipc } from "@/lib/ipc";
import { BROWSERS } from "@/lib/constants";
import { FolderOpen } from "lucide-react";
import type { Browser } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const useCookies = useSettingsStore((s) => s.useCookies);
  const setUseCookies = useSettingsStore((s) => s.setUseCookies);
  const cookieBrowser = useSettingsStore((s) => s.cookieBrowser);
  const setCookieBrowser = useSettingsStore((s) => s.setCookieBrowser);
  const savePath = useSettingsStore((s) => s.downloadPath);
  const setSavePath = useSettingsStore((s) => s.setDownloadPath);
  const ytdlp = useBinariesStore((s) => s.ytdlp);
  const ffmpeg = useBinariesStore((s) => s.ffmpeg);
  const ffprobe = useBinariesStore((s) => s.ffprobe);

  const handleSelectFolder = async () => {
    const selected = await ipc.selectFolder();
    if (selected) setSavePath(selected);
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title="Downloads">
        <SettingRow
          label="Pasta padrão"
          description="Onde os arquivos são salvos por padrão"
        >
          <Button
            variant="ghost"
            onClick={handleSelectFolder}
            className="h-auto gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <FolderOpen className="w-3 h-3" />
            <span className="font-mono truncate max-w-[280px]">
              {savePath || "Selecione uma pasta"}
            </span>
          </Button>
        </SettingRow>
      </Section>

      <Separator />

      <Section title="Autenticação">
        <SettingRow
          label="Usar cookies do navegador"
          description="Autentica com cookies do navegador para conteúdo restrito"
        >
          <Switch checked={useCookies} onCheckedChange={setUseCookies} />
        </SettingRow>

        {useCookies && (
          <SettingRow
            label="Navegador"
            description="De qual navegador extrair os cookies"
          >
            <Select
              value={cookieBrowser}
              onValueChange={(v) => v && setCookieBrowser(v as Browser)}
            >
              <SelectTrigger className="w-[110px] text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {BROWSERS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        )}
      </Section>

      <Separator />

      <Section title="Binários">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <VersionCard binary={ytdlp} />
          <VersionCard binary={ffmpeg} />
          <VersionCard binary={ffprobe} />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        {title}
      </span>
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground leading-snug">
          {description}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
