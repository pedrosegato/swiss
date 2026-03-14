import { Film, Music } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isVideoFormat } from "@/lib/constants";

interface FileThumbnailProps {
  inputExt: string;
  thumbnail?: string;
  thumbnailLoading?: boolean;
  className?: string;
}

export function FileThumbnail({
  inputExt,
  thumbnail,
  thumbnailLoading,
  className,
}: FileThumbnailProps) {
  const Icon = isVideoFormat(inputExt.replace(".", "")) ? Film : Music;

  if (thumbnailLoading) {
    return <Skeleton className={`${className} rounded`} />;
  }

  if (thumbnail) {
    return (
      <img src={thumbnail} alt="" className={`${className} object-cover rounded`} />
    );
  }

  return (
    <div className={`${className} bg-muted/30 rounded flex items-center justify-center`}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
  );
}
