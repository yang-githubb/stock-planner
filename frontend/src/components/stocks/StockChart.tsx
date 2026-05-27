import { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
} from "lightweight-charts";
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
} from "lightweight-charts";
import { BarChart3, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useStockCandles } from "@/hooks/useStocks";
import { sma, ema, rsi, candlesToLineData } from "@/lib/chartIndicators";

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
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlayRefs = useRef<ISeriesApi<"Line">[]>([]);

  const [periodIdx, setPeriodIdx] = useState(2);
  const [mode, setMode] = useState<ChartMode>("candlestick");
  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(false);
  const [showEma12, setShowEma12] = useState(false);
  const [showRsi, setShowRsi] = useState(false);
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
      overlayRefs.current = [];
    };
  }, [isDark]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !candles || candles.length === 0) return;

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
    for (const s of overlayRefs.current) {
      chart.removeSeries(s);
    }
    overlayRefs.current = [];

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

    const closes = candles.map((c) => c.close);
    if (showSma20) {
      const s = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 1,
        title: "SMA 20",
      });
      s.setData(candlesToLineData(candles, sma(closes, 20)));
      overlayRefs.current.push(s);
    }
    if (showSma50) {
      const s = chart.addSeries(LineSeries, {
        color: "#8b5cf6",
        lineWidth: 1,
        title: "SMA 50",
      });
      s.setData(candlesToLineData(candles, sma(closes, 50)));
      overlayRefs.current.push(s);
    }
    if (showEma12) {
      const s = chart.addSeries(LineSeries, {
        color: "#06b6d4",
        lineWidth: 1,
        title: "EMA 12",
      });
      s.setData(candlesToLineData(candles, ema(closes, 12)));
      overlayRefs.current.push(s);
    }

    chart.timeScale().fitContent();
  }, [candles, mode, showSma20, showSma50, showEma12]);

  useEffect(() => {
    if (!showRsi || !rsiContainerRef.current) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }
      return;
    }
    if (!candles || candles.length < 16) return;

    const container = rsiContainerRef.current;
    if (rsiChartRef.current) {
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
    }

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
      timeScale: { borderColor: isDark ? "#1e293b" : "#e2e8f0", visible: false },
      height: 100,
      width: container.clientWidth,
    });

    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
    });
    const closes = candles.map((c) => c.close);
    rsiSeries.setData(candlesToLineData(candles, rsi(closes, 14)));
    rsiSeries.createPriceLine({ price: 70, color: "rgba(239,68,68,0.4)", lineWidth: 1 });
    rsiSeries.createPriceLine({ price: 30, color: "rgba(16,185,129,0.4)", lineWidth: 1 });

    chart.timeScale().fitContent();
    rsiChartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (rsiContainerRef.current) {
        chart.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      rsiChartRef.current = null;
    };
  }, [candles, showRsi, isDark]);

  const toggleBtn = (
    active: boolean,
    onClick: () => void,
    label: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200"
          : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
      )}
    >
      {label}
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-500" />
          Price Chart
        </CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-slate-700">
            <span className="px-1 text-[10px] font-medium uppercase text-gray-400">
              Indicators
            </span>
            {toggleBtn(showSma20, () => setShowSma20((v) => !v), "SMA20")}
            {toggleBtn(showSma50, () => setShowSma50((v) => !v), "SMA50")}
            {toggleBtn(showEma12, () => setShowEma12((v) => !v), "EMA12")}
            {toggleBtn(showRsi, () => setShowRsi((v) => !v), "RSI")}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 dark:border-slate-700">
              <button
                type="button"
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
                type="button"
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
                  type="button"
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
        </div>
      </CardHeader>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-800/60">
            <Spinner />
          </div>
        )}
        <div ref={containerRef} className="h-[400px] w-full" />
        {!isLoading && (!candles || candles.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No chart data available for this period.
            </p>
          </div>
        )}
      </div>

      {showRsi && (
        <div className="border-t border-gray-100 px-1 pt-2 dark:border-slate-700">
          <p className="mb-1 text-[10px] font-medium uppercase text-gray-400">
            RSI (14) — dashed lines at 30 / 70
          </p>
          <div ref={rsiContainerRef} className="h-[100px] w-full" />
        </div>
      )}
    </Card>
  );
}
