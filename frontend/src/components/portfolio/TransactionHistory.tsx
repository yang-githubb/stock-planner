import { ArrowUpDown, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePortfolio } from "@/hooks/usePortfolios";
import { formatCurrency } from "@/lib/format";

export function TransactionHistory({
  portfolioId,
  onDelete,
}: {
  portfolioId: number;
  onDelete: (txId: number) => void;
}) {
  const { data: portfolio } = usePortfolio(portfolioId);
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
