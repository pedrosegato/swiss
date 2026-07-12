import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav-items";
import { PocketKnifeIcon, Settings } from "lucide-react";
import { UpdateBanner } from "./update-banner";
import { WindowControls } from "./window-controls";
import { ipc } from "@/lib/ipc";
import { buttonVariants } from "./ui/button";

export function Navbar() {
  const { location } = useRouterState();
  const isMac = ipc.platform === "darwin";

  return (
    <nav
      data-tauri-drag-region
      className={cn(
        "sticky top-0 z-50 flex items-center h-12 bg-background/92 backdrop-blur-xl border-b border-border [-webkit-app-region:drag]",
        isMac ? "pl-22 pr-6" : "pl-4 pr-0",
      )}
    >
      <div className="flex items-center gap-[7px] mr-2.5 [-webkit-app-region:no-drag]">
        <PocketKnifeIcon className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-[13px] tracking-[2px] text-foreground">
          swiss
        </span>
      </div>

      <div className="flex items-center gap-1 [-webkit-app-region:no-drag]">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 gap-1.5 px-3 text-[12.5px] font-medium",
              location.pathname === to &&
                "bg-primary/10 border border-primary/50 hover:bg-primary/20",
            )}
          >
            <Icon className="w-4 h-4 shrink-0 text-primary" />
            {label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center [-webkit-app-region:no-drag]">
        <Link
          to="/settings"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
        </Link>
        <UpdateBanner />
        <WindowControls />
      </div>
    </nav>
  );
}
