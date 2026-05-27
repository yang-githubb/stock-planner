import type { Watchlist, WatchlistItem } from "@/types";
import api from "./client";

export async function getWatchlists(): Promise<Watchlist[]> {
  const { data } = await api.get<Watchlist[]>("/watchlists/");
  return data;
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const { data } = await api.post<Watchlist>("/watchlists/", { name });
  return data;
}

export async function deleteWatchlist(id: number): Promise<void> {
  await api.delete(`/watchlists/${id}`);
}

export async function addToWatchlist(
  watchlistId: number,
  symbol: string,
  notes?: string
): Promise<WatchlistItem> {
  const { data } = await api.post<WatchlistItem>(
    `/watchlists/${watchlistId}/items`,
    { symbol, notes }
  );
  return data;
}

export async function updateItemNotes(
  watchlistId: number,
  itemId: number,
  notes: string | null
): Promise<Watchlist> {
  const { data } = await api.patch<Watchlist>(
    `/watchlists/${watchlistId}/items/${itemId}`,
    { notes }
  );
  return data;
}

export async function removeFromWatchlist(
  watchlistId: number,
  itemId: number
): Promise<void> {
  await api.delete(`/watchlists/${watchlistId}/items/${itemId}`);
}
