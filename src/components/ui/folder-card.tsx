import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

const folderCardVariants = cva(
  "relative overflow-hidden flex flex-col justify-between rounded-xl border p-4 transition-all duration-300 ease-in-out cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-purple-50/70 to-purple-100/70 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200/60 dark:border-purple-800/50",
        project:
          "bg-gradient-to-br from-fuchsia-50/70 to-fuchsia-100/70 dark:from-fuchsia-950/50 dark:to-fuchsia-900/50 border-fuchsia-200/60 dark:border-fuchsia-800/50",
        system:
          "bg-gradient-to-br from-cyan-50/70 to-cyan-100/70 dark:from-cyan-950/50 dark:to-cyan-900/50 border-cyan-200/60 dark:border-cyan-800/50",
        amber:
          "bg-gradient-to-br from-amber-50/70 to-amber-100/70 dark:from-amber-950/50 dark:to-amber-900/50 border-amber-200/60 dark:border-amber-800/50",
        emerald:
          "bg-gradient-to-br from-emerald-50/70 to-emerald-100/70 dark:from-emerald-950/50 dark:to-emerald-900/50 border-emerald-200/60 dark:border-emerald-800/50",
        rose:
          "bg-gradient-to-br from-rose-50/70 to-rose-100/70 dark:from-rose-950/50 dark:to-rose-900/50 border-rose-200/60 dark:border-rose-800/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconWrapVariants: Record<NonNullable<VariantProps<typeof folderCardVariants>["variant"]>, string> = {
  default: "bg-purple-200/60 text-purple-700 dark:bg-purple-800/60 dark:text-purple-200",
  project: "bg-fuchsia-200/60 text-fuchsia-700 dark:bg-fuchsia-800/60 dark:text-fuchsia-200",
  system: "bg-cyan-200/60 text-cyan-700 dark:bg-cyan-800/60 dark:text-cyan-200",
  amber: "bg-amber-200/60 text-amber-700 dark:bg-amber-800/60 dark:text-amber-200",
  emerald: "bg-emerald-200/60 text-emerald-700 dark:bg-emerald-800/60 dark:text-emerald-200",
  rose: "bg-rose-200/60 text-rose-700 dark:bg-rose-800/60 dark:text-rose-200",
};

export interface FolderCardProps
  extends Omit<HTMLMotionProps<"div">, "title">,
    VariantProps<typeof folderCardVariants> {
  icon: React.ReactNode;
  title: string;
  size: string;
}

const FolderCard = React.forwardRef<HTMLDivElement, FolderCardProps>(
  ({ className, variant, icon, title, size: cardSize, ...props }, ref) => {
    const v = variant ?? "default";
    return (
      <motion.div
        ref={ref}
        className={cn(folderCardVariants({ variant }), "min-h-[140px]", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg [&_svg]:size-5",
            iconWrapVariants[v],
          )}
        >
          {icon}
        </div>

        <div className="mt-4 space-y-0.5">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            {title}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{cardSize}</p>
        </div>
      </motion.div>
    );
  },
);
FolderCard.displayName = "FolderCard";

export { FolderCard, folderCardVariants };