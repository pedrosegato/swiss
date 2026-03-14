import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav-items";
import { PocketKnifeIcon } from "lucide-react";
import { UpdateBanner } from "./update-banner";
import { WindowControls } from "./window-controls";
import { ipc } from "@/lib/ipc";

export function Navbar() {
  const { location } = useRouterState();
  const isMac = ipc.platform === "darwin";

  return (
    <nav
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

      <div className="flex gap-0.5 [-webkit-app-region:no-drag]">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative inline-flex flex-row items-center gap-1.5 text-[12.5px] leading-none px-2.5 py-1.5 cursor-pointer transition-colors no-underline",
                isActive
                  ? "text-primary font-bold"
                  : "text-secondary-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none">{label}</span>
              {isActive && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute -bottom-[7px] left-2 right-2 h-[2px] bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      <UpdateBanner />
      <WindowControls />
    </nav>
  );
}
