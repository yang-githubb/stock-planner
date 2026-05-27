import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Building2,
  Plus,
  Check,
  AlertCircle,
  ChevronDown,
  Briefcase,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuoteDetail } from "@/components/stocks/QuoteDetail";
import { StockChart } from "@/components/stocks/StockChart";
import { NewsCard } from "@/components/stocks/NewsCard";
import { InsiderActivity } from "@/components/insiders/InsiderActivity";
import { useQuote, useCompanyProfile, useStockNews } from "@/hooks/useStocks";
import { useWatchlists, useAddToWatchlist, useCreateWatchlist } from "@/hooks/useWatchlists";

function formatMarketCap(m: number): string {
  if (m >= 1_000) return `$${(m / 1_000).toFixed(1)}T`;
  if (m >= 1) return `$${m.toFixed(1)}B`;
  return `$${(m * 1_000).toFixed(0)}M`;
}

export default function StockDetailPage() {
  const { symbol = "" } = useParams<{ symbol: string }>();
  const { data: quote, isLoading: quoteLoading, isError: quoteError } = useQuote(symbol);
  const { data: profile, isLoading: profileLoading, isError: profileError } = useCompanyProfile(symbol);
  const { data: news } = useStockNews(symbol);
  const { data: watchlists } = useWatchlists();
  const addToWatchlist = useAddToWatchlist();
  const createWatchlist = useCreateWatchlist();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const upperSymbol = symbol.toUpperCase();
  const isInWatchlist = watchlists?.some((w) =>
    w.items.some((i) => i.symbol === upperSymbol)
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAddToWatchlist(watchlistId?: number) {
    if (watchlistId) {
      addToWatchlist.mutate({ watchlistId, symbol: upperSymbol });
    } else {
      const wl = await createWatchlist.mutateAsync("My Watchlist");
      addToWatchlist.mutate({ watchlistId: wl.id, symbol: upperSymbol });
    }
    setDropdownOpen(false);
  }

  if (quoteLoading || profileLoading) return <PageSpinner />;

  if (quoteError && profileError) {
    return (
      <div className="space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <EmptyState
          icon={<AlertCircle size={48} />}
          title={`No data for "${symbol.toUpperCase()}"`}
          description="This stock may not be available on Finnhub's free tier. Only US-listed stocks are supported. Try searching for a US symbol like AAPL or MSFT."
          action={
            <Link to="/">
              <Button>Search on Dashboard</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile?.logo && (
            <img
              src={profile.logo}
              alt={profile.name}
              className="h-14 w-14 rounded-xl border border-gray-200 bg-white object-contain p-1 dark:border-slate-700 dark:bg-slate-800"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {symbol.toUpperCase()}
            </h1>
            {profile?.name && (
              <p className="text-gray-500 dark:text-gray-400">{profile.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/portfolio?buy=${upperSymbol}&price=${quote?.current_price ?? ""}`}>
            <Button variant="secondary">
              <Briefcase size={16} /> Record Buy
            </Button>
          </Link>
          <div className="relative" ref={dropdownRef}>
          {isInWatchlist ? (
            <Button variant="secondary" disabled>
              <Check size={16} /> In Watchlist
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={() => {
                  if (!watchlists?.length) {
                    handleAddToWatchlist();
                  } else if (watchlists.length === 1) {
                    handleAddToWatchlist(watchlists[0].id);
                  } else {
                    setDropdownOpen((o) => !o);
                  }
                }}
                disabled={addToWatchlist.isPending}
              >
                <Plus size={16} /> Add to Watchlist
                {watchlists && watchlists.length > 1 && <ChevronDown size={14} />}
              </Button>
              {dropdownOpen && watchlists && watchlists.length > 1 && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {watchlists.map((wl) => {
                    const alreadyIn = wl.items.some((i) => i.symbol === upperSymbol);
                    return (
                      <button
                        key={wl.id}
                        onClick={() => handleAddToWatchlist(wl.id)}
                        disabled={alreadyIn}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-slate-700"
                      >
                        {wl.name}
                        {alreadyIn && <Check size={14} className="text-green-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      <StockChart symbol={symbol.toUpperCase()} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {quote && <QuoteDetail quote={quote} />}

        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {profile.exchange && <Badge variant="info">{profile.exchange}</Badge>}
                {profile.industry && <Badge>{profile.industry}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Market Cap</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatMarketCap(profile.market_cap)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Shares Outstanding</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {profile.share_outstanding.toFixed(1)}M
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3 dark:border-slate-700">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <Globe size={14} />
                    Website
                    <ExternalLink size={12} />
                  </a>
                )}
                <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Building2 size={14} />
                  {profile.exchange}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      <InsiderActivity symbol={upperSymbol} />

      {news && news.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent News</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {news.slice(0, 6).map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
