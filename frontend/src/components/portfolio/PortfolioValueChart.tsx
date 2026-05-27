import { useEffect, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  type IChartApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import { LineChart } from "lucide-react";
import clsx from "clsx";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { usePortfolioPerformance } from "@/hooks/usePortfolios";

const PERIODS = [
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 1825 },
] as const;

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

export function PortfolioValueChart({ portfolioId }: { portfolioId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [periodIdx, setPeriodIdx] = useState(2);
  const isDark = useDarkMode();
  const days = PERIODS[periodIdx].days;

  const { data, isLoading, isError } = usePortfolioPerformance(portfolioId, days);
  const points = data?.points ?? [];
  const hasPoints = points.length > 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasPoints) return;

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
      width: container.clientWidth,
      height: 280,
    });

    const market = chart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 2,
      title: "Market value",
    });
    const cost = chart.addSeries(LineSeries, {
      color: isDark ? "#94a3b8" : "#64748b",
      lineWidth: 2,
      lineStyle: 2,
      title: "Cost basis",
    });

    const marketData: LineData[] = points.map((p) => ({
      time: p.time as Time,
      value: p.market_value,
    }));
    const costData: LineData[] = points.map((p) => ({
      time: p.time as Time,
      value: p.cost_basis,
    }));

    market.setData(marketData);
    cost.setData(costData);
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
  }, [hasPoints, points, isDark, portfolioId, days]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-indigo-500" />
          Portfolio value over time
        </CardTitle>
        <div className="flex gap-1">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPeriodIdx(i)}
              className={clsx(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                periodIdx === i
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="relative h-[280px] w-full">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
            <Spinner className="h-8 w-8" />
          </div>
        )}
        {isError && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Could not load performance history.
            </p>
          </div>
        )}
        {!isLoading && !isError && !hasPoints && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add transactions to see your portfolio value chart.
            </p>
          </div>
        )}
        <div
          ref={containerRef}
          className={clsx(
            "h-full w-full",
            (isLoading || isError || !hasPoints) && "pointer-events-none opacity-0"
          )}
        />
      </div>

      {hasPoints && !isLoading && (
        <div className="mt-2 flex gap-4 px-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-indigo-500" />
            Market value
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-slate-500" />
            Cost basis
          </span>
        </div>
      )}
    </Card>
  );
}
