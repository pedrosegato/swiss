import * as React from "react";
import { motion } from "motion/react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <motion.div
        data-slot="progress-indicator"
        className="bg-primary h-full rounded-full"
        initial={false}
        animate={{ width: `${value || 0}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
