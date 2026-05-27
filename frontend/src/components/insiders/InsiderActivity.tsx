import { Users } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useInsiderTransactions,
  useOwnershipSnapshots,
} from "@/hooks/useInsiders";
import {
  InsiderBrowseSection,
  InsiderDataFootnote,
  InsiderSummaryGrid,
} from "@/components/insiders/InsiderTransactionViews";

export function InsiderActivity({ symbol }: { symbol: string }) {
  const { data: insiders, isLoading, isError } = useInsiderTransactions(symbol);
  const { data: ownership } = useOwnershipSnapshots(symbol);
  const rows = insiders ?? [];

  return (
    <Card>
      <CardHeader className="mb-0">
        <CardTitle className="flex flex-col gap-1 text-xl font-bold text-slate-900 dark:text-slate-50">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            {symbol.toUpperCase()} insider activity
          </span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            Open-market buys use Form 4 code P; sells use S. Relation / owner
            columns reserved for richer filing data.
          </span>
        </CardTitle>
      </CardHeader>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="text-sm text-rose-600">Could not load insider data.</p>
      ) : !rows.length ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No insider transactions"
          description="No filings found for this symbol in the selected period."
        />
      ) : (
        <div className="space-y-6">
          <InsiderSummaryGrid rows={rows} />
          <div>
            <InsiderBrowseSection rows={rows} maxRows={25} />
          </div>
          <InsiderDataFootnote />
        </div>
      )}

      {ownership && ownership.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4 dark:border-slate-700">
          <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Institutional holders (snapshot)
          </h4>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {ownership.slice(0, 8).map((o, i) => (
              <li key={`${o.investor_name}-${i}`} className="flex justify-between">
                <span>{o.investor_name}</span>
                <span className="tabular-nums">
                  {o.share != null ? o.share.toLocaleString() : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ownership && ownership.length === 0 && (
        <p className="mt-4 text-xs text-gray-400">
          Institutional ownership may be unavailable on your Finnhub plan.
        </p>
      )}
    </Card>
  );
}
