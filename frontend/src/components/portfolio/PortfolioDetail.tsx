import { useState, useEffect } from "react";
import { Briefcase, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriceChange } from "@/components/stocks/PriceChange";
import { SymbolSearch } from "@/components/stocks/SymbolSearch";
import { PortfolioValueChart } from "@/components/portfolio/PortfolioValueChart";
import { PortfolioAllocation } from "@/components/portfolio/PortfolioAllocation";
import { SummaryCards } from "@/components/portfolio/SummaryCards";
import { TransactionHistory } from "@/components/portfolio/TransactionHistory";
import {
  usePortfolioSummary,
  useAddTransaction,
  useDeleteTransaction,
} from "@/hooks/usePortfolios";
import { formatCurrency } from "@/lib/format";

export function PortfolioDetail({
  portfolioId,
  initialSymbol,
  initialPrice,
}: {
  portfolioId: number;
  initialSymbol?: string;
  initialPrice?: string;
}) {
  const { data: summary, isLoading, isRefreshingPrices, lastPriceUpdate } =
    usePortfolioSummary(portfolioId);
  const addTransaction = useAddTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [showForm, setShowForm] = useState(!!initialSymbol);
  const [savedNotice, setSavedNotice] = useState(false);
  const [form, setForm] = useState({
    symbol: initialSymbol ?? "",
    type: "buy" as "buy" | "sell",
    shares: "",
    price_per_share: initialPrice ?? "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (initialSymbol) {
      setShowForm(true);
      setForm((f) => ({
        ...f,
        symbol: initialSymbol,
        price_per_share: initialPrice ?? f.price_per_share,
      }));
    }
  }, [initialSymbol, initialPrice]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol || !form.shares || !form.price_per_share) return;

    const transaction = {
      symbol: form.symbol.toUpperCase(),
      type: form.type,
      shares: parseFloat(form.shares),
      price_per_share: parseFloat(form.price_per_share),
      date: form.date,
      notes: form.notes || undefined,
    };

    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 3000);
    setShowForm(false);
    setForm({
      symbol: "",
      type: "buy",
      shares: "",
      price_per_share: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });

    addTransaction.mutate(
      { portfolioId, transaction },
      { onError: () => setSavedNotice(false) }
    );
  }

  if (isLoading) return <PageSpinner />;
  if (!summary) return null;

  return (
    <div className="space-y-4">
      {savedNotice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          Transaction saved
          {isRefreshingPrices && (
            <span className="ml-2 text-emerald-600/80 dark:text-emerald-300/80">
              · updating prices…
            </span>
          )}
        </div>
      )}
      <SummaryCards
        summary={summary}
        live={summary.holdings.length > 0}
        isRefreshingPrices={isRefreshingPrices}
        lastPriceUpdate={lastPriceUpdate}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioValueChart portfolioId={portfolioId} />
        </div>
        <PortfolioAllocation holdings={summary.holdings} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> Add Transaction
          </Button>
        </CardHeader>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-lg border border-gray-200 p-4 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <SymbolSearch
                value={form.symbol}
                onChange={(symbol) => setForm({ ...form, symbol })}
                placeholder="Search stock..."
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "buy" | "sell" })}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
              <Input
                placeholder="Shares"
                type="number"
                step="any"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: e.target.value })}
              />
              <Input
                placeholder="Price/share"
                type="number"
                step="any"
                value={form.price_per_share}
                onChange={(e) => setForm({ ...form, price_per_share: e.target.value })}
              />
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <Input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={addTransaction.isPending}>
                {addTransaction.isPending
                  ? "Saving…"
                  : form.type === "buy"
                    ? "Record Buy"
                    : "Record Sell"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {summary.holdings.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={48} />}
            title="No holdings yet"
            description="Add a transaction to start tracking your portfolio."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-slate-700 dark:text-gray-400">
                  <th className="pb-2 font-medium">Symbol</th>
                  <th className="pb-2 font-medium">Shares</th>
                  <th className="pb-2 font-medium">Avg Cost</th>
                  <th className="pb-2 font-medium">Current</th>
                  <th className="pb-2 font-medium">Market Value</th>
                  <th className="pb-2 font-medium">P&L</th>
                  <th className="pb-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {summary.holdings.map((h) => (
                  <tr key={h.symbol} className="border-b border-gray-50 dark:border-slate-800">
                    <td className="py-3">
                      <Link
                        to={`/stock/${h.symbol}`}
                        className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {h.symbol}
                      </Link>
                    </td>
                    <td className="py-3 text-gray-900 dark:text-gray-100">{h.shares}</td>
                    <td className="py-3 text-gray-900 dark:text-gray-100">{formatCurrency(h.avg_cost)}</td>
                    <td className="py-3 text-gray-900 dark:text-gray-100">
                      {h.current_price != null ? formatCurrency(h.current_price) : "—"}
                    </td>
                    <td className="py-3 font-medium text-gray-900 dark:text-gray-100">
                      {h.market_value != null ? formatCurrency(h.market_value) : "—"}
                    </td>
                    <td className="py-3">
                      {h.unrealized_pnl != null ? (
                        <span className={h.unrealized_pnl >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {h.unrealized_pnl >= 0 ? "+" : ""}
                          {formatCurrency(h.unrealized_pnl)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">
                      {h.unrealized_pnl_pct != null ? (
                        <PriceChange change={h.unrealized_pnl ?? 0} percentChange={h.unrealized_pnl_pct} size="sm" />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TransactionHistory
        portfolioId={portfolioId}
        onDelete={(txId) => deleteTransaction.mutate({ portfolioId, transactionId: txId })}
      />
    </div>
  );
}
