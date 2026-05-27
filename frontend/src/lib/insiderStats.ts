import type { InsiderTransaction } from "@/types";

export type InsiderTabFilter = "all" | "buys" | "sells";

/** Finnhub-style: P ≈ open-market purchase, S ≈ sale (Form 4 codes are approximate). */
export function isOpenMarketBuy(row: InsiderTransaction): boolean {
  return row.transaction_code === "P";
}

export function isSell(row: InsiderTransaction): boolean {
  return row.transaction_code === "S";
}

export function effectiveTime(row: InsiderTransaction): number | null {
  const raw = row.transaction_date ?? row.filing_date;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

function cutoffMonthsAgo(months: number): number {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.getTime();
}

function inWindow(row: InsiderTransaction, months: number): boolean {
  const t = effectiveTime(row);
  if (t == null) return false;
  return t >= cutoffMonthsAgo(months);
}

export interface InsiderWindowStats {
  openMarketBuys: number;
  sells: number;
  totalTrades: number;
  sharesBought: number;
  sharesSold: number;
  totalSharesTraded: number;
  netActivity: number;
}

function sumPositiveChange(rows: InsiderTransaction[]): number {
  return rows.reduce((acc, r) => {
    if (!isOpenMarketBuy(r) || r.change == null || r.change <= 0) return acc;
    return acc + r.change;
  }, 0);
}

function sumSellShares(rows: InsiderTransaction[]): number {
  return rows.reduce((acc, r) => {
    if (!isSell(r) || r.change == null || r.change >= 0) return acc;
    return acc + Math.abs(r.change);
  }, 0);
}

export function summarizeInsiderWindow(
  rows: InsiderTransaction[],
  months: number
): InsiderWindowStats {
  const w = rows.filter((r) => inWindow(r, months));
  const openMarketBuys = w.filter(isOpenMarketBuy).length;
  const sells = w.filter(isSell).length;
  const totalTrades = w.length;
  const sharesBought = sumPositiveChange(w);
  const sharesSold = sumSellShares(w);
  const totalSharesTraded = sharesBought + sharesSold;
  const netActivity = sharesBought - sharesSold;
  return {
    openMarketBuys,
    sells,
    totalTrades,
    sharesBought,
    sharesSold,
    totalSharesTraded,
    netActivity,
  };
}

export function filterInsiderRows(
  rows: InsiderTransaction[],
  tab: InsiderTabFilter
): InsiderTransaction[] {
  if (tab === "buys") return rows.filter(isOpenMarketBuy);
  if (tab === "sells") return rows.filter(isSell);
  return rows;
}

/** Collapse identical lines (repeated ingests). First row in array order wins. */
function roundKey(n: number | null | undefined, places: number): string {
  if (n == null || Number.isNaN(n)) return "";
  const f = 10 ** places;
  return String(Math.round(n * f) / f);
}

function dateKey(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = iso.trim();
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return s;
  return new Date(t).toISOString().slice(0, 10);
}

export function dedupeInsiderRows(rows: InsiderTransaction[]): InsiderTransaction[] {
  const seen = new Set<string>();
  const out: InsiderTransaction[] = [];
  for (const r of rows) {
    const key = [
      (r.symbol || "").toUpperCase(),
      (r.name || "").trim().toUpperCase(),
      dateKey(r.filing_date),
      dateKey(r.transaction_date),
      roundKey(r.change, 4),
      (r.transaction_code || "").toUpperCase(),
      roundKey(r.transaction_price, 4),
      roundKey(r.share, 4),
    ].join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function tradeNotional(row: InsiderTransaction): number | null {
  const ch = row.change;
  const p = row.transaction_price;
  if (ch == null || p == null || p <= 0) return null;
  return Math.abs(ch) * p;
}

export function sharesTraded(row: InsiderTransaction): number | null {
  if (row.change == null) return null;
  return Math.abs(row.change);
}
