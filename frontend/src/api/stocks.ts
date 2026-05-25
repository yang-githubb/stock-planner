import type { StockQuote, CompanyProfile, StockSearchResult, MarketNews, StockCandle } from "@/types";
import api from "./client";

export async function getTrendingSymbols(): Promise<string[]> {
  const { data } = await api.get<{ symbols: string[] }>("/stocks/trending");
  return data.symbols;
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const { data } = await api.get<{ results: StockSearchResult[] }>(
    "/stocks/search",
    { params: { q: query } }
  );
  return data.results;
}

export async function getQuote(symbol: string): Promise<StockQuote> {
  const { data } = await api.get<StockQuote>(`/stocks/${symbol}/quote`);
  return data;
}

export async function getCompanyProfile(symbol: string): Promise<CompanyProfile> {
  const { data } = await api.get<CompanyProfile>(`/stocks/${symbol}/profile`);
  return data;
}

export async function getStockNews(symbol: string): Promise<MarketNews[]> {
  const { data } = await api.get<{ news: MarketNews[] }>(`/stocks/${symbol}/news`);
  return data.news;
}

export async function getMarketNews(): Promise<MarketNews[]> {
  const { data } = await api.get<{ news: MarketNews[] }>("/stocks/market/news");
  return data.news;
}

export async function getStockCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<StockCandle[]> {
  const { data } = await api.get<{ candles: StockCandle[] }>(
    `/stocks/${symbol}/candles`,
    { params: { resolution, from_ts: from, to_ts: to } }
  );
  return data.candles;
}
