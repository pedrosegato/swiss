import { motion } from "motion/react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { LucideIcon } from "lucide-react";

interface EmptyQueueProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyQueue({ icon: Icon, title, description }: EmptyQueueProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <Empty className="py-12 border-0">
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
              <Icon className="w-8 h-8 text-muted-foreground" />
            </motion.div>
          </EmptyMedia>
          <EmptyTitle className="text-[14px]">{title}</EmptyTitle>
          <EmptyDescription className="text-[12px]">
            {description}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </motion.div>
  );
}
