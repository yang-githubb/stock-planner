import { useEffect, useRef, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createChart,
  LineSeries,
  ColorType,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import { X, GitCompareArrows } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PriceChange } from "@/components/stocks/PriceChange";
import { SymbolSearch } from "@/components/stocks/SymbolSearch";
import { useQuotes, useStockCandles } from "@/hooks/useStocks";

const PERIODS = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
] as const;

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function formatPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function formatMcap(m: number) {
  if (m >= 1_000) return `$${(m / 1_000).toFixed(1)}T`;
  if (m >= 1) return `$${m.toFixed(1)}B`;
  return `$${(m * 1_000).toFixed(0)}M`;
}

function useDarkMode() {
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

/* ── single symbol's candle data ── */
function useCandles(symbol: string, days: number) {
  const now = useMemo(() => Math.floor(Date.now() / 1000), []);
  return useStockCandles(symbol, "D", now - days * 86400, now);
}

function NormalizedChart({
  symbols,
  days,
  isDark,
}: {
  symbols: string[];
  days: number;
  isDark: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const d0 = useCandles(symbols[0] ?? "", days);
  const d1 = useCandles(symbols[1] ?? "", days);
  const d2 = useCandles(symbols[2] ?? "", days);
  const d3 = useCandles(symbols[3] ?? "", days);
  const allData = [d0, d1, d2, d3].slice(0, symbols.length);
  const anyLoading = allData.some((d) => d.isLoading);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    if (anyLoading || symbols.length === 0) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#9ca3af" : "#6b7280",
      },
      grid: {
        vertLines: { color: isDark ? "#1e293b" : "#f1f5f9" },
        horzLines: { color: isDark ? "#1e293b" : "#f1f5f9" },
      },
      rightPriceScale: { borderColor: isDark ? "#1e293b" : "#e2e8f0" },
      timeScale: { borderColor: isDark ? "#1e293b" : "#e2e8f0" },
      height: 320,
      width: container.clientWidth,
    });

    symbols.forEach((sym, idx) => {
      const candles = allData[idx]?.data ?? [];
      if (!candles.length) return;
      const base = candles[0].close;
      const series = chart.addSeries(LineSeries, {
        color: COLORS[idx % COLORS.length],
        lineWidth: 2,
        title: sym,
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => `${p >= 0 ? "+" : ""}${p.toFixed(1)}%` },
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as Time,
          value: parseFloat((((c.close - base) / base) * 100).toFixed(2)),
        }))
      );
    });

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), days, isDark, anyLoading]);

  if (symbols.length === 0) return null;

  return (
    <div className="relative">
      {anyLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/70">
          <Spinner className="h-6 w-6" />
        </div>
      )}
      <div ref={containerRef} className="h-[320px] w-full" />
      <p className="mt-1 text-right text-[10px] text-gray-400">
        % return from start of period (normalised)
      </p>
    </div>
  );
}

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [addQuery, setAddQuery] = useState("");
  const [periodIdx, setPeriodIdx] = useState(2);
  const isDark = useDarkMode();

  const symbols: string[] = useMemo(() => {
    const raw = searchParams.get("symbols") ?? "";
    return raw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 4);
  }, [searchParams]);

  const days = PERIODS[periodIdx].days;

  const { data: quotes, isLoading: quotesLoading } = useQuotes(symbols);

  function addSymbol(sym: string) {
    const upper = sym.trim().toUpperCase();
    if (!upper || symbols.includes(upper) || symbols.length >= 4) return;
    setSearchParams({ symbols: [...symbols, upper].join(",") });
    setAddQuery("");
  }

  function removeSymbol(sym: string) {
    const next = symbols.filter((s) => s !== sym);
    setSearchParams(next.length ? { symbols: next.join(",") } : {});
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
          <GitCompareArrows className="h-6 w-6 text-indigo-500" />
          Compare Stocks
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Up to 4 symbols</p>
      </div>

      {/* symbol chips + search */}
      <div className="flex flex-wrap items-center gap-2">
        {symbols.map((sym, i) => (
          <span
            key={sym}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          >
            {sym}
            <button
              type="button"
              onClick={() => removeSymbol(sym)}
              className="opacity-80 hover:opacity-100"
              aria-label={`Remove ${sym}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        {symbols.length < 4 && (
          <div className="flex items-center gap-2">
            <SymbolSearch
              value={addQuery}
              onChange={(s) => {
                setAddQuery(s);
                // When user picks from the dropdown, s is the symbol; add it
                if (s && s === s.toUpperCase() && s.length >= 1) addSymbol(s);
              }}
              placeholder="Add symbol…"
              className="w-44"
            />
          </div>
        )}
      </div>

      {symbols.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
          Search and add symbols above to start comparing.
        </p>
      )}

      {symbols.length > 0 && (
        <>
          {/* period selector */}
          <div className="flex gap-1">
            {PERIODS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPeriodIdx(i)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  i === periodIdx
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* normalised chart */}
          <Card>
            <CardHeader>
              <CardTitle>Relative performance</CardTitle>
            </CardHeader>
            <NormalizedChart symbols={symbols} days={days} isDark={isDark} />
          </Card>

          {/* quote cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {symbols.map((sym, i) => {
              const q = quotes?.[sym];
              return (
                <Card key={sym}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className="mb-1 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <p className="ml-3 inline text-base font-bold text-gray-900 dark:text-gray-100">
                        {sym}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSymbol(sym)}
                      className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {quotesLoading ? (
                    <Spinner className="mt-2 h-4 w-4" />
                  ) : q ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(q.current_price)}
                      </p>
                      <PriceChange change={q.change} percentChange={q.percent_change} size="sm" />
                      <div className="mt-2 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <p>Open: {formatCurrency(q.open)}</p>
                        <p>High: {formatCurrency(q.high)}</p>
                        <p>Low: {formatCurrency(q.low)}</p>
                        <p>Prev close: {formatCurrency(q.previous_close)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400">No quote data</p>
                  )}
                </Card>
              );
            })}
          </div>

          {/* pct-change table */}
          {!quotesLoading && quotes && Object.keys(quotes).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quick comparison</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500 dark:border-slate-700 dark:text-gray-400">
                      <th className="pb-2 font-medium">Symbol</th>
                      <th className="pb-2 font-medium">Price</th>
                      <th className="pb-2 font-medium">Day change</th>
                      <th className="pb-2 font-medium">Day %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbols.map((sym) => {
                      const q = quotes[sym];
                      if (!q) return null;
                      return (
                        <tr key={sym} className="border-b border-gray-50 dark:border-slate-800">
                          <td className="py-2 font-semibold text-indigo-600 dark:text-indigo-400">{sym}</td>
                          <td className="py-2 text-gray-900 dark:text-gray-100">{formatCurrency(q.current_price)}</td>
                          <td className={`py-2 font-medium ${q.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {q.change >= 0 ? "+" : ""}{formatCurrency(q.change)}
                          </td>
                          <td className={`py-2 font-medium ${q.percent_change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {formatPct(q.percent_change)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
