import { useMemo, useState } from "react";
import clsx from "clsx";
import type { InsiderTransaction } from "@/types";
import {
  filterInsiderRows,
  summarizeInsiderWindow,
  tradeNotional,
  sharesTraded,
  dedupeInsiderRows,
  type InsiderTabFilter,
} from "@/lib/insiderStats";

export function txLabel(code: string | null) {
  if (!code) return "—";
  const map: Record<string, string> = {
    S: "Sell",
    P: "Purchase",
    A: "Award",
    M: "Exercise",
    F: "Tax",
    G: "Gift",
  };
  return map[code] ?? code;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function formatInt(n: number) {
  return n.toLocaleString();
}

function formatNetShares(n: number) {
  if (n < 0) return `(${formatInt(Math.abs(n))})`;
  return formatInt(n);
}

function formatUsdCompact(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const tableWrap =
  "overflow-hidden rounded-lg border border-slate-200 text-sm dark:border-slate-600";
const thRow =
  "border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300";
const tdBase = "px-3 py-2.5 text-slate-800 dark:text-slate-100";

function SummaryPair({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; m3: number; m12: number; format?: "net" }[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h4>
      <div className={tableWrap}>
        <table className="w-full text-left">
          <thead>
            <tr className={thRow}>
              <th className={`${tdBase} font-semibold`}>Insider trade</th>
              <th className={`${tdBase} text-right font-semibold`}>3 months</th>
              <th className={`${tdBase} text-right font-semibold`}>12 months</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.label}
                className={clsx(
                  "border-b border-slate-100 last:border-b-0 dark:border-slate-700",
                  i % 2 === 1 && "bg-slate-50/80 dark:bg-slate-800/50"
                )}
              >
                <td className={tdBase}>{r.label}</td>
                <td className={`${tdBase} text-right tabular-nums`}>
                  {r.format === "net"
                    ? formatNetShares(r.m3)
                    : formatInt(r.m3)}
                </td>
                <td className={`${tdBase} text-right tabular-nums`}>
                  {r.format === "net"
                    ? formatNetShares(r.m12)
                    : formatInt(r.m12)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Nasdaq-style 3mo / 12mo summary tables from transaction rows. */
export function InsiderSummaryGrid({ rows }: { rows: InsiderTransaction[] }) {
  const clean = useMemo(() => dedupeInsiderRows(rows), [rows]);
  const s3 = useMemo(() => summarizeInsiderWindow(clean, 3), [clean]);
  const s12 = useMemo(() => summarizeInsiderWindow(clean, 12), [clean]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SummaryPair
        title="Number of insider trades"
        rows={[
          {
            label: "Number of open market buys",
            m3: s3.openMarketBuys,
            m12: s12.openMarketBuys,
          },
          { label: "Number of sells", m3: s3.sells, m12: s12.sells },
          {
            label: "Total insider trades",
            m3: s3.totalTrades,
            m12: s12.totalTrades,
          },
        ]}
      />
      <SummaryPair
        title="Number of insider shares traded"
        rows={[
          {
            label: "Number of shares bought",
            m3: s3.sharesBought,
            m12: s12.sharesBought,
          },
          {
            label: "Number of shares sold",
            m3: s3.sharesSold,
            m12: s12.sharesSold,
          },
          {
            label: "Total shares traded",
            m3: s3.totalSharesTraded,
            m12: s12.totalSharesTraded,
          },
          {
            label: "Net activity",
            m3: s3.netActivity,
            m12: s12.netActivity,
            format: "net",
          },
        ]}
      />
    </div>
  );
}

export function InsiderDetailTable({
  rows,
  maxRows = 25,
}: {
  rows: InsiderTransaction[];
  maxRows?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className={clsx(tableWrap, "min-w-[720px]")}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={thRow}>
              <th className={`${tdBase} font-semibold`}>Insider</th>
              <th className={`${tdBase} font-semibold`}>Relation</th>
              <th className={`${tdBase} text-right font-semibold`}>Last date</th>
              <th className={`${tdBase} font-semibold`}>Transaction</th>
              <th className={`${tdBase} font-semibold`}>Owner type</th>
              <th className={`${tdBase} text-right font-semibold`}>
                Shares traded
              </th>
              <th className={`${tdBase} text-right font-semibold`}>Price</th>
              <th className={`${tdBase} text-right font-semibold`}>Value</th>
              <th className={`${tdBase} text-right font-semibold`}>
                Shares held
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, maxRows).map((r, i) => {
              const st = sharesTraded(r);
              const notion = tradeNotional(r);
              const code = r.transaction_code;
              const txClass =
                code === "S"
                  ? "text-rose-700 dark:text-rose-400"
                  : code === "P"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-600 dark:text-slate-400";

              return (
                <tr
                  key={`${r.filing_date}-${r.name}-${r.transaction_date}-${i}`}
                  className={clsx(
                    "border-b border-slate-100 dark:border-slate-700",
                    i % 2 === 1 && "bg-slate-50/80 dark:bg-slate-800/50"
                  )}
                >
                  <td
                    className={`${tdBase} max-w-[10rem] truncate font-medium text-indigo-700 dark:text-indigo-400`}
                    title={r.name ?? undefined}
                  >
                    {r.name ?? "—"}
                  </td>
                  <td className={`${tdBase} text-slate-500 dark:text-slate-400`}>
                    —
                  </td>
                  <td
                    className={`${tdBase} text-right tabular-nums text-slate-700 dark:text-slate-300`}
                  >
                    {formatDate(r.transaction_date ?? r.filing_date)}
                  </td>
                  <td className={clsx(tdBase, "whitespace-nowrap", txClass)}>
                    {txLabel(code)}
                  </td>
                  <td className={`${tdBase} text-slate-500 dark:text-slate-400`}>
                    —
                  </td>
                  <td
                    className={clsx(
                      tdBase,
                      "text-right tabular-nums font-medium",
                      (r.change ?? 0) < 0
                        ? "text-rose-600"
                        : (r.change ?? 0) > 0
                          ? "text-emerald-600"
                          : "text-slate-600"
                    )}
                  >
                    {st != null ? formatInt(st) : "—"}
                  </td>
                  <td
                    className={`${tdBase} text-right tabular-nums text-slate-700 dark:text-slate-300`}
                  >
                    {r.transaction_price != null && r.transaction_price > 0
                      ? `$${r.transaction_price.toFixed(2)}`
                      : "—"}
                  </td>
                  <td
                    className={`${tdBase} text-right tabular-nums text-slate-800 dark:text-slate-200`}
                  >
                    {formatUsdCompact(notion)}
                  </td>
                  <td
                    className={`${tdBase} text-right tabular-nums text-slate-700 dark:text-slate-300`}
                  >
                    {r.share != null ? formatInt(Math.round(r.share)) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tabBtn =
  "rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

/** All / Buys / Sells tabs + detail table. */
export function InsiderBrowseSection({
  rows,
  maxRows = 25,
}: {
  rows: InsiderTransaction[];
  maxRows?: number;
}) {
  const [tab, setTab] = useState<InsiderTabFilter>("all");
  const clean = useMemo(() => dedupeInsiderRows(rows), [rows]);
  const filtered = useMemo(
    () => filterInsiderRows(clean, tab),
    [clean, tab]
  );

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-900">
        {(
          [
            ["all", "All trades"],
            ["buys", "Buys"],
            ["sells", "Sells"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={clsx(
              tabBtn,
              tab === key
                ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-800"
            )}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <InsiderDetailTable rows={filtered} maxRows={maxRows} />
    </div>
  );
}

export function InsiderDataFootnote() {
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      3- and 12-month windows use each row&apos;s transaction date, or filing
      date if missing. Buys/sells use Form 4 codes P/S only. Repeated identical
      lines from multiple ingests are shown once. Data depends on your
      market-data provider.
    </p>
  );
}
