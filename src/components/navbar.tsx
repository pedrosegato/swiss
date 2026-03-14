import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav-items";
import { PocketKnifeIcon } from "lucide-react";

export function Navbar() {
  const { location } = useRouterState();

  return (
    <nav className="sticky top-0 z-50 flex items-center pl-22 pr-6 h-12 bg-background/92 backdrop-blur-xl border-b border-border [-webkit-app-region:drag]">
      <div className="flex items-center gap-[7px] mr-[10px] [-webkit-app-region:no-drag]">
        <PocketKnifeIcon className="w-4 h-4" />
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
                "relative flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 cursor-pointer transition-colors no-underline",
                isActive
                  ? "text-foreground font-medium"
                  : "text-secondary-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {isActive ? (
                <span className="absolute bottom-[-1px] left-3 right-3 h-0.5 bg-primary rounded-sm" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
