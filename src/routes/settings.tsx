import { createFileRoute } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/settings-store";
import { useBinariesStore } from "@/stores/binaries-store";
import { SettingRow } from "@/features/settings/components/setting-row";
import { PathDisplay } from "@/features/settings/components/path-display";
import { VersionCard } from "@/features/settings/components/version-card";
import { BROWSERS } from "@/lib/constants";
import type { Browser } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const downloadPath = useSettingsStore((s) => s.downloadPath);
  const setDownloadPath = useSettingsStore((s) => s.setDownloadPath);
  const useCookies = useSettingsStore((s) => s.useCookies);
  const setUseCookies = useSettingsStore((s) => s.setUseCookies);
  const cookieBrowser = useSettingsStore((s) => s.cookieBrowser);
  const setCookieBrowser = useSettingsStore((s) => s.setCookieBrowser);
  const ytdlp = useBinariesStore((s) => s.ytdlp);
  const ffmpeg = useBinariesStore((s) => s.ffmpeg);

  return (
    <>
      <div className="flex items-baseline gap-3 mb-7">
        <h1 className="text-lg font-semibold tracking-tight">Configurações</h1>
      </div>

      <Section title="Autenticação">
        <SettingRow
          label="Usar cookies do navegador"
          description="Autentica o yt-dlp com cookies do seu navegador para acessar conteúdo restrito ou privado"
        >
          <Switch checked={useCookies} onCheckedChange={setUseCookies} />
        </SettingRow>

        {useCookies ? (
          <SettingRow
            label="Navegador"
            description="Escolha de qual navegador extrair os cookies"
          >
            <Select
              value={cookieBrowser}
              onValueChange={(v) => v && setCookieBrowser(v as Browser)}
            >
              <SelectTrigger className="w-[120px] text-xs h-9">
                <SelectValue>
                  {(v: string) =>
                    v ? v.charAt(0).toUpperCase() + v.slice(1) : "—"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BROWSERS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        ) : null}
      </Section>

      <Separator className="my-6" />

      <Section title="Downloads">
        <Card className="px-4 py-4 mb-2">
          <div className="text-[13px] font-medium mb-0.5">
            Pasta padrão de download
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            Onde os arquivos baixados são salvos por padrão
          </div>
          <PathDisplay path={downloadPath} onChangePath={setDownloadPath} />
        </Card>
      </Section>

      <Separator className="my-6" />

      <Section title="Binários">
        <div className="grid grid-cols-2 gap-2">
          <VersionCard binary={ytdlp} />
          <VersionCard binary={ffmpeg} />
        </div>
      </Section>
    </>
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
    <div className="mb-2">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}
