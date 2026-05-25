import { useQuery } from "@tanstack/react-query";
import { searchStocks, getQuote, getCompanyProfile, getStockNews, getMarketNews, getStockCandles, getTrendingSymbols } from "@/api/stocks";

export function useTrendingSymbols() {
  return useQuery({
    queryKey: ["trendingSymbols"],
    queryFn: getTrendingSymbols,
    staleTime: 60 * 60_000,
  });
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ["stockSearch", query],
    queryFn: () => searchStocks(query),
    enabled: query.length >= 1,
    staleTime: 30_000,
  });
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => getQuote(symbol),
    enabled: !!symbol,
    refetchInterval: 60_000,
  });
}

export function useCompanyProfile(symbol: string) {
  return useQuery({
    queryKey: ["companyProfile", symbol],
    queryFn: () => getCompanyProfile(symbol),
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  });
}

export function useStockNews(symbol: string) {
  return useQuery({
    queryKey: ["stockNews", symbol],
    queryFn: () => getStockNews(symbol),
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  });
}

export function useMarketNews() {
  return useQuery({
    queryKey: ["marketNews"],
    queryFn: getMarketNews,
    staleTime: 5 * 60_000,
  });
}

export function useStockCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number
) {
  return useQuery({
    queryKey: ["stockCandles", symbol, resolution, from, to],
    queryFn: () => getStockCandles(symbol, resolution, from, to),
    enabled: !!symbol && from > 0 && to > 0,
    staleTime: 5 * 60_000,
  });
}
