import type { StockQuote } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PriceChange } from "./PriceChange";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0 dark:border-slate-700">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}

export function QuoteDetail({ quote }: { quote: StockQuote }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote</CardTitle>
      </CardHeader>
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          ${quote.current_price.toFixed(2)}
        </p>
        <PriceChange
          change={quote.change}
          percentChange={quote.percent_change}
          size="lg"
        />
      </div>
      <div>
        <Metric label="Open" value={`$${quote.open.toFixed(2)}`} />
        <Metric label="Previous Close" value={`$${quote.previous_close.toFixed(2)}`} />
        <Metric label="Day High" value={`$${quote.high.toFixed(2)}`} />
        <Metric label="Day Low" value={`$${quote.low.toFixed(2)}`} />
      </div>
    </Card>
  );
}
