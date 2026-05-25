import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStockSearch } from "@/hooks/useStocks";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);
  const { data: results, isLoading, isError } = useStockSearch(query);

  useEffect(() => {
    const q = params.get("q") ?? "";
    setInput(q);
    setQuery(q);
  }, [params]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (q) {
      setQuery(q);
      setParams({ q });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Search Stocks
        </h1>
        <form onSubmit={handleSubmit} className="max-w-xl">
          <Input
            icon={<Search size={18} />}
            placeholder="Symbol or company name..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </form>
      </div>

      {isLoading && <PageSpinner />}

      {isError && (
        <Card className="border-rose-200 dark:border-rose-800">
          <p className="text-sm text-rose-600 dark:text-rose-400">
            Failed to search. Make sure the backend is running and your Finnhub API key
            is configured.
          </p>
        </Card>
      )}

      {results && results.length === 0 && query && (
        <EmptyState
          icon={<Search size={48} />}
          title="No results found"
          description={`No stocks matched "${query}". Try a different search term.`}
        />
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <Link
              key={r.symbol}
              to={`/stock/${r.symbol}`}
              className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-600"
            >
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {r.symbol}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {r.description}
                </span>
                <Badge>{r.type}</Badge>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
