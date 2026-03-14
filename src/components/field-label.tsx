import { cn } from "@/lib/utils";

export function FieldLabel({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <label className="block text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
