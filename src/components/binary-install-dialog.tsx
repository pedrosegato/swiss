import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useBinariesStore } from "@/stores/binaries-store";
import { ipc } from "@/lib/ipc";

interface BinaryInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BinaryInstallDialog({
  open,
  onOpenChange,
}: BinaryInstallDialogProps) {
  const ytdlp = useBinariesStore((s) => s.ytdlp);
  const ffmpeg = useBinariesStore((s) => s.ffmpeg);
  const setYtdlp = useBinariesStore((s) => s.setYtdlp);
  const setFfmpeg = useBinariesStore((s) => s.setFfmpeg);

  const missing: string[] = [];
  if (!ytdlp.installed) missing.push("yt-dlp");
  if (!ffmpeg.installed) missing.push("ffmpeg");

  const isDownloading = ytdlp.downloading || ffmpeg.downloading;

  const handleInstall = async () => {
    const promises: Promise<void>[] = [];

    if (!ytdlp.installed) {
      setYtdlp({ ...ytdlp, downloading: true });
      promises.push(
        ipc.installBinary("yt-dlp").then((result) => {
          setYtdlp({
            name: "yt-dlp",
            version: result.version,
            installed: result.success,
            path: result.path,
            source: result.source,
            downloading: false,
          });
        }),
      );
    }

    if (!ffmpeg.installed) {
      setFfmpeg({ ...ffmpeg, downloading: true });
      promises.push(
        ipc.installBinary("ffmpeg").then((result) => {
          setFfmpeg({
            name: "ffmpeg",
            version: result.version,
            installed: result.success,
            path: result.path,
            source: result.source,
            downloading: false,
          });
        }),
      );
    }

    await Promise.all(promises);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Binários necessários</AlertDialogTitle>
          <AlertDialogDescription>
            {isDownloading
              ? "Baixando binários, aguarde..."
              : `Para funcionar, é preciso instalar seguintes binários: ${missing.join(" e ")}. Deseja instalá-los agora?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isDownloading ? null : (
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onOpenChange(false)}>
              Agora não
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleInstall}>
              Instalar
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
