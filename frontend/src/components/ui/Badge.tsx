import clsx from "clsx";
import type { HTMLAttributes } from "react";

const variants = {
  default: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
