import type { PortfolioSummary, Holding } from "@/types";

type TxInput = {
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price_per_share: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function recomputeTotals(holdings: Holding[], totalRealized: number) {
  const active = holdings.filter((h) => h.shares >= 0.001);
  const totalInvested = active.reduce((s, h) => s + h.total_cost, 0);
  const withPrices = active.filter((h) => h.market_value != null);
  const totalMarketValue = withPrices.reduce((s, h) => s + (h.market_value ?? 0), 0);
  const hasAllPrices = active.length > 0 && withPrices.length === active.length;

  return {
    total_invested: round2(totalInvested),
    total_market_value: hasAllPrices ? round2(totalMarketValue) : null,
    total_unrealized_pnl: hasAllPrices ? round2(totalMarketValue - totalInvested) : null,
    total_realized_pnl: round2(totalRealized),
    holdings: active,
  };
}

/** Apply a pending transaction to summary for instant UI feedback. */
export function applyTransactionToSummary(
  summary: PortfolioSummary,
  tx: TxInput
): PortfolioSummary {
  const symbol = tx.symbol.toUpperCase();
  const holdings = summary.holdings.map((h) => ({ ...h }));
  let totalRealized = summary.total_realized_pnl;
  let idx = holdings.findIndex((h) => h.symbol === symbol);

  if (tx.type === "buy") {
    const cost = tx.shares * tx.price_per_share;
    if (idx >= 0) {
      const h = holdings[idx];
      const newShares = h.shares + tx.shares;
      const newCost = h.total_cost + cost;
      const price = h.current_price ?? tx.price_per_share;
      holdings[idx] = {
        ...h,
        shares: round2(newShares),
        avg_cost: round2(newCost / newShares),
        total_cost: round2(newCost),
        current_price: price,
        market_value: round2(price * newShares),
        unrealized_pnl: round2(price * newShares - newCost),
        unrealized_pnl_pct: newCost > 0 ? round2(((price * newShares - newCost) / newCost) * 100) : 0,
      };
    } else {
      holdings.push({
        symbol,
        shares: round2(tx.shares),
        avg_cost: round2(tx.price_per_share),
        total_cost: round2(cost),
        current_price: tx.price_per_share,
        market_value: round2(cost),
        unrealized_pnl: 0,
        unrealized_pnl_pct: 0,
      });
    }
  } else {
    if (idx < 0) return summary;
    const h = holdings[idx];
    const avgCost = h.total_cost / h.shares;
    const newShares = h.shares - tx.shares;
    totalRealized += tx.shares * (tx.price_per_share - avgCost);
    const newCost = h.total_cost - tx.shares * avgCost;
    const price = h.current_price;

    if (newShares < 0.001) {
      holdings.splice(idx, 1);
    } else {
      holdings[idx] = {
        ...h,
        shares: round2(newShares),
        avg_cost: round2(avgCost),
        total_cost: round2(newCost),
        market_value: price != null ? round2(price * newShares) : null,
        unrealized_pnl: price != null ? round2(price * newShares - newCost) : null,
        unrealized_pnl_pct:
          price != null && newCost > 0
            ? round2(((price * newShares - newCost) / newCost) * 100)
            : null,
      };
    }
  }

  return {
    ...summary,
    ...recomputeTotals(holdings, totalRealized),
  };
}
