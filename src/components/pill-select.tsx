import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const pillTriggerClass =
  "h-9 w-auto min-w-[92px] rounded-full text-xs gap-1.5";

interface PillSelectGroup {
  label: string;
  options: readonly string[];
}

interface PillSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options?: readonly string[];
  groups?: PillSelectGroup[];
  className?: string;
}

export function PillSelect({
  value,
  onValueChange,
  options,
  groups,
  className,
}: PillSelectProps) {
  const renderItem = (o: string) => (
    <SelectItem key={o} value={o}>
      {o}
    </SelectItem>
  );

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(pillTriggerClass, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {groups
          ? groups.map((g) => (
              <SelectGroup key={g.label}>
                <SelectLabel>{g.label}</SelectLabel>
                {g.options.map(renderItem)}
              </SelectGroup>
            ))
          : options?.map(renderItem)}
      </SelectContent>
    </Select>
  );
}
