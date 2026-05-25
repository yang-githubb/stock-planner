import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWatchlists,
  createWatchlist,
  deleteWatchlist,
  addToWatchlist,
  updateItemNotes,
  removeFromWatchlist,
} from "@/api/watchlists";

export function useWatchlists() {
  return useQuery({
    queryKey: ["watchlists"],
    queryFn: getWatchlists,
  });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createWatchlist(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useDeleteWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWatchlist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      watchlistId,
      symbol,
      notes,
    }: {
      watchlistId: number;
      symbol: string;
      notes?: string;
    }) => addToWatchlist(watchlistId, symbol, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useUpdateItemNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      watchlistId,
      itemId,
      notes,
    }: {
      watchlistId: number;
      itemId: number;
      notes: string | null;
    }) => updateItemNotes(watchlistId, itemId, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      watchlistId,
      itemId,
    }: {
      watchlistId: number;
      itemId: number;
    }) => removeFromWatchlist(watchlistId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });
}
