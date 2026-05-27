import api from "./client";
import type { InsiderTransaction, OwnershipSnapshot } from "@/types";

export async function getInsiderTransactions(
  symbol: string
): Promise<InsiderTransaction[]> {
  const { data } = await api.get<InsiderTransaction[]>(
    `/insiders/${symbol.toUpperCase()}/transactions`
  );
  return data;
}

export async function getOwnershipSnapshots(
  symbol: string
): Promise<OwnershipSnapshot[]> {
  const { data } = await api.get<OwnershipSnapshot[]>(
    `/insiders/${symbol.toUpperCase()}/ownership`
  );
  return data;
}

export async function getMyInsiderFeed(): Promise<{
  symbols: string[];
  feed: Record<string, InsiderTransaction[]>;
}> {
  const { data } = await api.get<{
    symbols: string[];
    feed: Record<string, InsiderTransaction[]>;
  }>("/insiders/feed/me");
  return data;
}
