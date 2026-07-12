import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

type JobQueueVariant = "scale" | "slideX";

const VARIANTS = {
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  slideX: {
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 12 },
  },
} as const;

interface JobQueueProps {
  ids: string[];
  renderRow: (id: string) => ReactNode;
  containerClassName: string;
  variant: JobQueueVariant;
  staggerCap: number;
}

export function JobQueue({
  ids,
  renderRow,
  containerClassName,
  variant,
  staggerCap,
}: JobQueueProps) {
  const transitions = VARIANTS[variant];

  return (
    <div className={containerClassName}>
      <AnimatePresence mode="popLayout">
        {ids.map((id, i) => (
          <motion.div
            key={id}
            layout
            initial={transitions.initial}
            animate={transitions.animate}
            exit={transitions.exit}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 28,
              delay: i < staggerCap ? i * 0.035 : 0,
            }}
          >
            {renderRow(id)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
