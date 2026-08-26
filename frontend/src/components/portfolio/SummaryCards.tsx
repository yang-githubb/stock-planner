import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format";
import type { PortfolioSummary } from "@/types";

export function SummaryCards({
  summary,
  live,
  isRefreshingPrices,
  lastPriceUpdate,
}: {
  summary: PortfolioSummary;
  live?: boolean;
  isRefreshingPrices?: boolean;
  lastPriceUpdate?: number;
}) {
  return (
    <div className="space-y-2">
      {live && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              isRefreshingPrices ? "animate-pulse bg-amber-400" : "bg-emerald-500"
            }`}
            aria-hidden
          />
          <span>Live prices · updates every 15s</span>
          {lastPriceUpdate ? (
            <span className="text-gray-400">
              · {new Date(lastPriceUpdate).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      )}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">Total Invested</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {formatCurrency(summary.total_invested)}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">Market Value</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {summary.total_market_value != null ? formatCurrency(summary.total_market_value) : "—"}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">Unrealized P&L</p>
        <p className={`text-2xl font-bold ${(summary.total_unrealized_pnl ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {summary.total_unrealized_pnl != null ? (
            <>
              {summary.total_unrealized_pnl >= 0 ? <TrendingUp className="mr-1 inline h-5 w-5" /> : <TrendingDown className="mr-1 inline h-5 w-5" />}
              {summary.total_unrealized_pnl >= 0 ? "+" : ""}
              {formatCurrency(summary.total_unrealized_pnl)}
            </>
          ) : (
            "—"
          )}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">Realized P&L</p>
        <p className={`text-2xl font-bold ${summary.total_realized_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {summary.total_realized_pnl >= 0 ? "+" : ""}
          {formatCurrency(summary.total_realized_pnl)}
        </p>
      </Card>
    </div>
    </div>
  );
}
