import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface JobShellProps extends ComponentProps<"div"> {
  isError?: boolean;
}

export function JobShell({ isError, className, ...props }: JobShellProps) {
  return (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-xl ring-1 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        isError
          ? "ring-destructive/30"
          : "ring-foreground/10 hover:ring-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
        className,
      )}
      {...props}
    />
  );
}
