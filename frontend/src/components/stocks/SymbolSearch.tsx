import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useStockSearch } from "@/hooks/useStocks";
import { useDebounce } from "@/hooks/useDebounce";

interface SymbolSearchProps {
  value: string;
  onChange: (symbol: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SymbolSearch({
  value,
  onChange,
  placeholder = "Search symbol...",
  className,
  autoFocus,
}: SymbolSearchProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const { data: results, isLoading } = useStockSearch(debouncedQuery);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(symbol: string) {
    setQuery(symbol);
    onChange(symbol);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <Input
        icon={<Search size={14} />}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange("");
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        autoFocus={autoFocus}
      />
      {open && debouncedQuery.length >= 2 && (
        <div className="absolute left-0 z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Spinner className="h-4 w-4" />
            </div>
          ) : !results?.length ? (
            <p className="px-3 py-2 text-sm text-gray-500">No results found</p>
          ) : (
            results.slice(0, 8).map((r) => (
              <button
                key={r.symbol}
                type="button"
                onClick={() => handleSelect(r.symbol)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {r.symbol}
                </span>
                <span className="max-w-[60%] truncate text-xs text-gray-500 dark:text-gray-400">
                  {r.description}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
