export function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
