import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { PriceChange } from "./PriceChange";
import { useQuote } from "@/hooks/useStocks";
import { Spinner } from "@/components/ui/Spinner";
import type { StockQuote } from "@/types";

interface StockCardProps {
  symbol: string;
  name?: string;
  /** When provided (e.g. from StockCardGrid), skips per-card fetch */
  quote?: StockQuote;
  isLoading?: boolean;
}

export function StockCard({ symbol, name, quote: quoteProp, isLoading: loadingProp }: StockCardProps) {
  const { data: fetched, isLoading: fetching } = useQuote(symbol, quoteProp === undefined);
  const quote = quoteProp ?? fetched;
  const isLoading = loadingProp ?? (quoteProp === undefined && fetching);

  return (
    <Link to={`/stock/${symbol}`}>
      <Card className="transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {symbol}
            </p>
            {name && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                {name}
              </p>
            )}
          </div>
          {isLoading ? (
            <Spinner className="h-5 w-5" />
          ) : quote ? (
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ${quote.current_price.toFixed(2)}
              </p>
              <PriceChange
                change={quote.change}
                percentChange={quote.percent_change}
                size="sm"
              />
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
