import { Card } from "@/components/ui/card";

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <Card className="px-4 py-4 mb-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium mb-0.5">{label}</div>
          <div className="text-[11.5px] text-muted-foreground leading-snug">
            {description}
          </div>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    </Card>
  );
}
