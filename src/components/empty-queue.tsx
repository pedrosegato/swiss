import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface EmptyQueueProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyQueue({ icon: Icon, title, description }: EmptyQueueProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
      <Empty className="border-0 py-12">
        <EmptyHeader>
          <EmptyMedia>
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Icon className="text-muted-foreground h-8 w-8" />
            </motion.div>
          </EmptyMedia>
          <EmptyTitle className="text-[15px]">{title}</EmptyTitle>
          <EmptyDescription className="text-[13px]">{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </motion.div>
  );
}
