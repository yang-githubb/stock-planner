import { useNavigate } from "react-router-dom";
import { TrendingUp, Newspaper, Star } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StockCardGrid } from "@/components/stocks/StockCardGrid";
import { SymbolSearch } from "@/components/stocks/SymbolSearch";
import { NewsCard } from "@/components/stocks/NewsCard";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWatchlists } from "@/hooks/useWatchlists";
import { useMarketNews, useTrendingSymbols } from "@/hooks/useStocks";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: watchlists } = useWatchlists();
  const { data: news, isLoading: newsLoading } = useMarketNews();
  const { data: trending } = useTrendingSymbols();

  const watchlistSymbols =
    watchlists?.flatMap((w) => w.items.map((i) => i.symbol)) ?? [];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-gray-100">
          Stock Research
        </h1>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          Search stocks, track your watchlist, and stay on top of market news.
        </p>
        <div className="mx-auto max-w-lg">
          <SymbolSearch
            value=""
            onChange={(symbol) => {
              if (symbol) navigate(`/stock/${symbol}`);
            }}
            placeholder="Search by symbol or company name..."
            autoFocus
          />
        </div>
      </div>

      {watchlistSymbols.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Your Watchlist
            </h2>
          </div>
          <StockCardGrid symbols={watchlistSymbols} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Trending Stocks
          </h2>
        </div>
        <StockCardGrid symbols={trending ?? []} />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-indigo-500" />
              Market News
            </CardTitle>
          </CardHeader>
          {newsLoading ? (
            <PageSpinner />
          ) : !news?.length ? (
            <EmptyState
              icon={<Newspaper size={48} />}
              title="No news available"
              description="Market news will appear here once the Finnhub API is configured."
            />
          ) : (
            <div className="space-y-3">
              {news.slice(0, 8).map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
