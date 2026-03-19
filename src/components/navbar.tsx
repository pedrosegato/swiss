import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/nav-items";
import { PocketKnifeIcon, Settings } from "lucide-react";
import { UpdateBanner } from "./update-banner";
import { WindowControls } from "./window-controls";
import { ipc } from "@/lib/ipc";
import { buttonVariants } from "./ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";

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

      <NavigationMenu className="[-webkit-app-region:no-drag]">
        <NavigationMenuList>
          {navGroups.map((group) => (
            <NavigationMenuItem key={group.label}>
              <NavigationMenuTrigger className="h-8 text-[12.5px] px-3 py-1.5">
                {group.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-[280px] space-y-1">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavigationMenuLink
                        asChild
                        active={location.pathname === to}
                      >
                        <Link
                          to={to}
                          className={cn(
                            "flex flex-row items-center gap-2 rounded-sm text-sm transition-all outline-none hover:bg-accent hover:text-accent-foreground",
                            location.pathname === to &&
                              "bg-primary/10 border border-primary/50 hover:bg-primary/20",
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0 text-primary" />
                          <div className="flex flex-col">
                            <span className="font-medium leading-none">
                              {label}
                            </span>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

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
