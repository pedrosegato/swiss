import { DownloadCloud, RefreshCw, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/downloader", label: "Download", icon: DownloadCloud },
  { to: "/converter", label: "Converter", icon: RefreshCw },
  { to: "/settings", label: "Configurações", icon: Settings },
];
