import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
  secondary:
    "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-100 dark:hover:bg-slate-600",
  ghost:
    "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
