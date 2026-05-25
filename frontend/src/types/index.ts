export interface StockQuote {
  symbol: string;
  current_price: number;
  change: number;
  percent_change: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  industry: string;
  logo: string;
  market_cap: number;
  share_outstanding: number;
  website: string;
}

export interface StockSearchResult {
  symbol: string;
  description: string;
  type: string;
}

export interface MarketNews {
  id: number;
  category: string;
  headline: string;
  summary: string;
  url: string;
  image: string;
  source: string;
  datetime: number;
}

export interface StockCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WatchlistItem {
  id: number;
  watchlist_id: number;
  symbol: string;
  added_at: string;
  notes: string | null;
}

export interface Watchlist {
  id: number;
  name: string;
  created_at: string;
  items: WatchlistItem[];
}

export interface Transaction {
  id: number;
  portfolio_id: number;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price_per_share: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface Portfolio {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  transactions: Transaction[];
}

export interface Holding {
  symbol: string;
  shares: number;
  avg_cost: number;
  total_cost: number;
  current_price: number | null;
  market_value: number | null;
  unrealized_pnl: number | null;
  unrealized_pnl_pct: number | null;
}

export interface PortfolioSummary {
  id: number;
  name: string;
  description: string | null;
  total_invested: number;
  total_market_value: number | null;
  total_unrealized_pnl: number | null;
  total_realized_pnl: number;
  holdings: Holding[];
}
