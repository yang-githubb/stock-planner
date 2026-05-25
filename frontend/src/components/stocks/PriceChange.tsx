import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import clsx from "clsx";

interface PriceChangeProps {
  change: number;
  percentChange: number;
  size?: "sm" | "md" | "lg";
}

export function PriceChange({ change, percentChange, size = "md" }: PriceChangeProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSize = { sm: 12, md: 14, lg: 16 };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 font-medium",
        sizeClasses[size],
        isNeutral && "text-gray-500",
        isPositive && "text-emerald-600 dark:text-emerald-400",
        !isPositive && !isNeutral && "text-rose-600 dark:text-rose-400"
      )}
    >
      {isNeutral ? (
        <Minus size={iconSize[size]} />
      ) : isPositive ? (
        <TrendingUp size={iconSize[size]} />
      ) : (
        <TrendingDown size={iconSize[size]} />
      )}
      {isPositive ? "+" : ""}
      {change.toFixed(2)} ({isPositive ? "+" : ""}
      {percentChange.toFixed(2)}%)
    </span>
  );
}
