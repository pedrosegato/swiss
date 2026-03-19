import { DownloadCloud, RefreshCw, Merge } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Vídeos",
    items: [
      {
        to: "/downloader",
        label: "Download",
        icon: DownloadCloud,
      },
      {
        to: "/converter",
        label: "Converter",
        icon: RefreshCw,
      },
      {
        to: "/merge",
        label: "Mesclagem",
        icon: Merge,
      },
    ],
  },
];
