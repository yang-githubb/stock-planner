import type { PortfolioSummary, StockQuote } from "@/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Overlay live quote prices onto a DB-backed portfolio summary. */
export function mergeQuotesIntoSummary(
  summary: PortfolioSummary,
  quotes: Record<string, StockQuote> | undefined
): PortfolioSummary {
  if (!quotes || Object.keys(quotes).length === 0) {
    return summary;
  }

  const active = summary.holdings.filter((h) => h.shares >= 0.001);
  if (active.length === 0) {
    return summary;
  }

  let totalInvested = 0;
  let totalMarketValue = 0;
  let pricedCount = 0;

  const holdings = summary.holdings.map((h) => {
    if (h.shares < 0.001) {
      return h;
    }

    totalInvested += h.total_cost;
    const quote = quotes[h.symbol];
    if (!quote) {
      return h;
    }

    pricedCount += 1;
    const currentPrice = quote.current_price;
    const marketValue = currentPrice * h.shares;
    const unrealized = marketValue - h.total_cost;
    totalMarketValue += marketValue;

    return {
      ...h,
      current_price: round2(currentPrice),
      market_value: round2(marketValue),
      unrealized_pnl: round2(unrealized),
      unrealized_pnl_pct:
        h.total_cost > 0 ? round2((unrealized / h.total_cost) * 100) : 0,
    };
  });

  const hasAllPrices = pricedCount === active.length;

  return {
    ...summary,
    holdings,
    total_invested: round2(totalInvested),
    total_market_value: hasAllPrices ? round2(totalMarketValue) : summary.total_market_value,
    total_unrealized_pnl: hasAllPrices
      ? round2(totalMarketValue - totalInvested)
      : summary.total_unrealized_pnl,
  };
}
