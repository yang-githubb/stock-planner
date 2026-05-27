import { useQuery } from "@tanstack/react-query";
import {
  getInsiderTransactions,
  getMyInsiderFeed,
  getOwnershipSnapshots,
} from "@/api/insiders";

export function useInsiderTransactions(symbol: string) {
  return useQuery({
    queryKey: ["insiderTransactions", symbol],
    queryFn: () => getInsiderTransactions(symbol),
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  });
}

export function useOwnershipSnapshots(symbol: string) {
  return useQuery({
    queryKey: ["ownershipSnapshots", symbol],
    queryFn: () => getOwnershipSnapshots(symbol),
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  });
}

export function useMyInsiderFeed(enabled: boolean) {
  return useQuery({
    queryKey: ["myInsiderFeed"],
    queryFn: getMyInsiderFeed,
    enabled,
    staleTime: 60_000,
  });
}
