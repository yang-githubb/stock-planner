import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Briefcase,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriceChange } from "@/components/stocks/PriceChange";
import { SymbolSearch } from "@/components/stocks/SymbolSearch";
import {
  usePortfolios,
  usePortfolioSummary,
  useCreatePortfolio,
  useDeletePortfolio,
  useAddTransaction,
  useDeleteTransaction,
} from "@/hooks/usePortfolios";
import type { PortfolioSummary } from "@/types";
import { Link } from "react-router-dom";

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function PortfolioDetail({
  portfolioId,
  initialSymbol,
  initialPrice,
}: {
  portfolioId: number;
  initialSymbol?: string;
  initialPrice?: string;
}) {
  const { data: summary, isLoading } = usePortfolioSummary(portfolioId);
  const addTransaction = useAddTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [showForm, setShowForm] = useState(!!initialSymbol);
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

    addTransaction.mutate({
      portfolioId,
      transaction: {
        symbol: form.symbol.toUpperCase(),
        type: form.type,
        shares: parseFloat(form.shares),
        price_per_share: parseFloat(form.price_per_share),
        date: new Date(form.date).toISOString(),
        notes: form.notes || undefined,
      },
    });
    setForm({
      symbol: "",
      type: "buy",
      shares: "",
      price_per_share: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setShowForm(false);
  }

  if (isLoading) return <PageSpinner />;
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <SummaryCards summary={summary} />

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
                {form.type === "buy" ? "Record Buy" : "Record Sell"}
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

function SummaryCards({ summary }: { summary: PortfolioSummary }) {
  return (
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
  );
}

function TransactionHistory({
  portfolioId,
  onDelete,
}: {
  portfolioId: number;
  onDelete: (txId: number) => void;
}) {
  const { data: portfolios } = usePortfolios();
  const portfolio = portfolios?.find((p) => p.id === portfolioId);
  const transactions = portfolio?.transactions ?? [];

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sorted.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-indigo-500" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 dark:border-slate-700 dark:text-gray-400">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Symbol</th>
              <th className="pb-2 font-medium">Shares</th>
              <th className="pb-2 font-medium">Price</th>
              <th className="pb-2 font-medium">Total</th>
              <th className="pb-2 font-medium">Notes</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => (
              <tr key={tx.id} className="border-b border-gray-50 dark:border-slate-800">
                <td className="py-2 text-gray-700 dark:text-gray-300">
                  {new Date(tx.date).toLocaleDateString()}
                </td>
                <td className="py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      tx.type === "buy"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    }`}
                  >
                    {tx.type.toUpperCase()}
                  </span>
                </td>
                <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{tx.symbol}</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">{tx.shares}</td>
                <td className="py-2 text-gray-900 dark:text-gray-100">{formatCurrency(tx.price_per_share)}</td>
                <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(tx.shares * tx.price_per_share)}
                </td>
                <td className="py-2 text-xs text-gray-500 dark:text-gray-400">{tx.notes ?? ""}</td>
                <td className="py-2">
                  <button
                    onClick={() => onDelete(tx.id)}
                    className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                    title="Delete transaction"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function PortfolioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  const buySymbol = searchParams.get("buy") ?? undefined;
  const buyPrice = searchParams.get("price") ?? undefined;

  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (buySymbol && searchParams.has("buy")) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim()) {
      createPortfolio.mutate({ name: newName.trim() });
      setNewName("");
    }
  }

  const activePortfolio = selectedId ?? portfolios?.[0]?.id ?? null;

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Portfolio
        </h1>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="New portfolio name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-48"
          />
          <Button type="submit" size="md" disabled={!newName.trim()}>
            <Plus size={16} /> Create
          </Button>
        </form>
      </div>

      {(!portfolios || portfolios.length === 0) ? (
        <EmptyState
          icon={<Briefcase size={48} />}
          title="No portfolios yet"
          description="Create a portfolio to start tracking your investments and P&L."
          action={
            buySymbol ? (
              <Button
                variant="primary"
                onClick={() => createPortfolio.mutate({ name: "My Portfolio" })}
              >
                <Plus size={16} /> Create Portfolio & Record Buy
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {portfolios.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <Button
                  variant={activePortfolio === p.id ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setSelectedId(p.id)}
                >
                  {p.name}
                </Button>
                <button
                  onClick={() => {
                    deletePortfolio.mutate(p.id);
                    if (selectedId === p.id) setSelectedId(null);
                  }}
                  className="rounded p-1 text-gray-400 hover:text-rose-500"
                  title="Delete portfolio"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {activePortfolio && (
            <PortfolioDetail
              portfolioId={activePortfolio}
              initialSymbol={buySymbol}
              initialPrice={buyPrice}
            />
          )}
        </>
      )}
    </div>
  );
}
