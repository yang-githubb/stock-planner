import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useMyInsiderFeed } from "@/hooks/useInsiders";
import {
  InsiderBrowseSection,
  InsiderDataFootnote,
  InsiderSummaryGrid,
} from "@/components/insiders/InsiderTransactionViews";

export default function InsiderFeedPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useMyInsiderFeed(!!user);

  if (!user) {
    return (
      <EmptyState
        icon={<Users size={48} />}
        title="Sign in required"
        description="Sign in to see insider activity for symbols on your watchlists."
      />
    );
  }

  if (isLoading) return <PageSpinner />;

  if (isError) {
    return (
      <p className="text-sm text-rose-600">
        Could not load your insider feed. Ensure you are signed in.
      </p>
    );
  }

  const symbols = data?.symbols ?? [];
  const feed = data?.feed ?? {};

  return (
    <div className="space-y-6">
      <Link
        to="/watchlist"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400"
      >
        <ArrowLeft size={16} />
        Back to Watchlist
      </Link>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        <Users className="h-6 w-6 text-indigo-500" />
        My insider feed
      </h1>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Per-symbol summaries and tables match the stock detail insider section.
      </p>

      {symbols.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No watchlist symbols"
          description="Add stocks to your watchlist to track insider filings."
          action={
            <Link to="/watchlist">
              <Button>Go to Watchlist</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {symbols.map((sym) => {
            const rows = feed[sym] ?? [];
            return (
              <Card key={sym}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
                    <Link
                      to={`/stock/${sym}`}
                      className="text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {sym}
                    </Link>
                    <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">
                      Insider activity
                    </span>
                  </CardTitle>
                </CardHeader>
                {rows.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent filings.</p>
                ) : (
                  <div className="space-y-6">
                    <InsiderSummaryGrid rows={rows} />
                    <InsiderBrowseSection rows={rows} maxRows={12} />
                    <InsiderDataFootnote />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
