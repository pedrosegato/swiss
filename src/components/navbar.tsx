import { Link, useRouterState } from "@tanstack/react-router";
import { PocketKnifeIcon, Settings } from "lucide-react";

import { ipc } from "@/lib/ipc";
import { navItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

import { buttonVariants } from "./ui/button";
import { UpdateBanner } from "./update-banner";
import { WindowControls } from "./window-controls";

export function Navbar() {
  const { location } = useRouterState();
  const isMac = ipc.platform === "darwin";

  return (
    <nav
      data-tauri-drag-region
      className={cn(
        "bg-background/92 border-border sticky top-0 z-50 flex h-12 items-center border-b backdrop-blur-xl [-webkit-app-region:drag]",
        isMac ? "pr-6 pl-22" : "pr-0 pl-4",
      )}
    >
      <div className="mr-2.5 flex items-center gap-[7px] [-webkit-app-region:no-drag]">
        <PocketKnifeIcon className="h-4 w-4 shrink-0" />
        <span className="text-foreground text-[13px] font-semibold tracking-[2px]">swiss</span>
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
                "bg-primary/10 border-primary/50 hover:bg-primary/20 border",
            )}
          >
            <Icon className="text-primary h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center [-webkit-app-region:no-drag]">
        <Link to="/settings" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <Settings className="h-3.5 w-3.5 shrink-0" />
        </Link>
        <UpdateBanner />
        <WindowControls />
      </div>
    </nav>
  );
}
