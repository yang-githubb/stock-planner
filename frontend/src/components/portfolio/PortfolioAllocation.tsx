import type { Holding } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PieChart } from "lucide-react";

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

interface Props {
  holdings: Holding[];
}

export function PortfolioAllocation({ holdings }: Props) {
  const withValue = holdings.filter((h) => (h.market_value ?? 0) > 0);
  if (withValue.length === 0) return null;

  const total = withValue.reduce((s, h) => s + (h.market_value ?? 0), 0);
  // Sort largest first
  const sorted = [...withValue].sort((a, b) => (b.market_value ?? 0) - (a.market_value ?? 0));

  // Build donut slices
  const cx = 80;
  const cy = 80;
  const r = 64;
  const ir = 38; // inner radius for donut hole
  const slices: { path: string; color: string; symbol: string; pct: number }[] = [];
  let cursor = 0;

  sorted.forEach((h, i) => {
    const pct = (h.market_value ?? 0) / total;
    const sweep = pct * 360;
    const start = cursor;
    const end = cursor + sweep;

    // draw a ring segment
    const outerStart = polarToCartesian(cx, cy, r, start);
    const outerEnd = polarToCartesian(cx, cy, r, end);
    const innerStart = polarToCartesian(cx, cy, ir, start);
    const innerEnd = polarToCartesian(cx, cy, ir, end);
    const large = sweep > 180 ? 1 : 0;

    const path = [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${r} ${r} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${ir} ${ir} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");

    slices.push({ path, color: COLORS[i % COLORS.length], symbol: h.symbol, pct: pct * 100 });
    cursor += sweep;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-indigo-500" />
          Allocation
        </CardTitle>
      </CardHeader>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* Donut */}
        <svg width={160} height={160} className="shrink-0">
          {slices.map((s) => (
            <path key={s.symbol} d={s.path} fill={s.color} />
          ))}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400"
            fontSize={10}
          >
            Total
          </text>
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            className="fill-gray-900 dark:fill-gray-100"
            fontSize={11}
            fontWeight="600"
          >
            {total >= 1_000_000
              ? `$${(total / 1_000_000).toFixed(1)}M`
              : total >= 1_000
                ? `$${(total / 1_000).toFixed(1)}K`
                : `$${total.toFixed(0)}`}
          </text>
        </svg>

        {/* Legend */}
        <ul className="flex flex-1 flex-col gap-2 text-sm">
          {slices.map((s) => (
            <li key={s.symbol} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-semibold text-gray-900 dark:text-gray-100">{s.symbol}</span>
              <span className="ml-auto tabular-nums text-gray-500 dark:text-gray-400">
                {s.pct.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
