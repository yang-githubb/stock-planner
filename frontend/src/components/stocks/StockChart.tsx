import { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData, Time } from "lightweight-charts";
import { BarChart3, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useStockCandles } from "@/hooks/useStocks";

const PERIODS = [
  { label: "1M", days: 30, resolution: "D" },
  { label: "3M", days: 90, resolution: "D" },
  { label: "6M", days: 180, resolution: "D" },
  { label: "1Y", days: 365, resolution: "D" },
  { label: "5Y", days: 1825, resolution: "W" },
] as const;

type ChartMode = "candlestick" | "line";

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

export function StockChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [periodIdx, setPeriodIdx] = useState(2);
  const [mode, setMode] = useState<ChartMode>("candlestick");
  const isDark = useDarkMode();

  const period = PERIODS[periodIdx];
  const now = useMemo(() => Math.floor(Date.now() / 1000), []);
  const from = now - period.days * 86400;

  const { data: candles, isLoading } = useStockCandles(
    symbol,
    period.resolution,
    from,
    now
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#9ca3af" : "#6b7280",
        fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: isDark ? "#1e293b" : "#f1f5f9" },
        horzLines: { color: isDark ? "#1e293b" : "#f1f5f9" },
      },
      crosshair: {
        vertLine: { labelBackgroundColor: isDark ? "#334155" : "#6366f1" },
        horzLine: { labelBackgroundColor: isDark ? "#334155" : "#6366f1" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
      },
      timeScale: {
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
        timeVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !candles || candles.length === 0) return;

    // Remove old series
    if (candleSeriesRef.current) {
      chart.removeSeries(candleSeriesRef.current);
      candleSeriesRef.current = null;
    }
    if (lineSeriesRef.current) {
      chart.removeSeries(lineSeriesRef.current);
      lineSeriesRef.current = null;
    }
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    const timeData = candles.map((c) => ({
      ...c,
      time: c.time as Time,
    }));

    if (mode === "candlestick") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#10b981",
        wickDownColor: "#ef4444",
        wickUpColor: "#10b981",
      });
      series.setData(timeData as CandlestickData<Time>[]);
      candleSeriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries, {
        color: "#6366f1",
        lineWidth: 2,
      });
      const lineData: LineData<Time>[] = timeData.map((c) => ({
        time: c.time,
        value: c.close,
      }));
      series.setData(lineData);
      lineSeriesRef.current = series;
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    const volumeData: HistogramData<Time>[] = timeData.map((c) => ({
      time: c.time,
      value: c.volume,
      color:
        c.close >= c.open
          ? "rgba(16, 185, 129, 0.3)"
          : "rgba(239, 68, 68, 0.3)",
    }));
    volumeSeries.setData(volumeData);
    volumeSeriesRef.current = volumeSeries;

    chart.timeScale().fitContent();
  }, [candles, mode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-500" />
          Price Chart
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setMode("candlestick")}
              className={clsx(
                "flex items-center gap-1 rounded-l-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                mode === "candlestick"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700"
              )}
            >
              <BarChart3 size={12} />
              Candle
            </button>
            <button
              onClick={() => setMode("line")}
              className={clsx(
                "flex items-center gap-1 rounded-r-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                mode === "line"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700"
              )}
            >
              <TrendingUp size={12} />
              Line
            </button>
          </div>

          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700">
            {PERIODS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPeriodIdx(i)}
                className={clsx(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                  i === periodIdx
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-800/60">
            <Spinner />
          </div>
        )}
        <div
          ref={containerRef}
          className="h-[400px] w-full"
        />
        {!isLoading && (!candles || candles.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No chart data available for this period.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
