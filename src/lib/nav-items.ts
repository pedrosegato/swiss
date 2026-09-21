import type { LucideIcon } from "lucide-react";
import { DownloadCloud, Merge, RefreshCw } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
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
];
