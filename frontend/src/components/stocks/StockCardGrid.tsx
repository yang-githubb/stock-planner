import { StockCard } from "./StockCard";
import { useQuotes } from "@/hooks/useStocks";

interface StockCardGridProps {
  symbols: string[];
  className?: string;
}

export function StockCardGrid({ symbols, className }: StockCardGridProps) {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean))];
  const { data: quotes, isLoading } = useQuotes(unique);

  if (!unique.length) return null;

  return (
    <div className={className ?? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {unique.map((symbol) => (
        <StockCard
          key={symbol}
          symbol={symbol}
          quote={quotes?.[symbol]}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
