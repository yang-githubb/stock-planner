import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPortfolios,
  getPortfolio,
  getPortfolioSummary,
  getPortfolioPerformance,
  createPortfolio,
  deletePortfolio,
  addTransaction,
  deleteTransaction,
} from "@/api/portfolios";
import { applyTransactionToSummary } from "@/lib/portfolioOptimistic";
import { mergeQuotesIntoSummary } from "@/lib/portfolioLive";
import { useQuotes } from "@/hooks/useStocks";
import { useAuth } from "@/context/AuthContext";
import type { Portfolio, PortfolioSummary } from "@/types";

const summaryKey = (id: number) => ["portfolioSummary", id] as const;
const portfolioKey = (id: number) => ["portfolio", id] as const;
const performanceKey = (id: number, days: number) =>
  ["portfolioPerformance", id, days] as const;

function quotesKey(symbols: string[]) {
  return ["quotes", [...new Set(symbols.map((s) => s.toUpperCase()))].sort().join(",")] as const;
}

function refreshLiveQuotes(
  qc: ReturnType<typeof useQueryClient>,
  symbols: string[]
) {
  if (!symbols.length) return;
  void qc.invalidateQueries({ queryKey: quotesKey(symbols) });
}

export function usePortfolios() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: getPortfolios,
    // Portfolios are per-user; don't fire unauthenticated requests
    enabled: !!user,
  });
}

export function usePortfolio(id: number) {
  return useQuery({
    queryKey: portfolioKey(id),
    queryFn: () => getPortfolio(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function usePortfolioPerformance(id: number, days = 365) {
  return useQuery({
    queryKey: performanceKey(id, days),
    queryFn: () => getPortfolioPerformance(id, days),
    enabled: id > 0,
    staleTime: 60 * 60_000,
  });
}

/** Fast DB summary + live prices polled every 15s via batch quotes API. */
export function usePortfolioSummary(id: number) {
  const cached = useQuery({
    queryKey: summaryKey(id),
    queryFn: () => getPortfolioSummary(id, false),
    enabled: id > 0,
    staleTime: 30_000,
  });

  const symbols = useMemo(
    () => cached.data?.holdings.map((h) => h.symbol) ?? [],
    [cached.data?.holdings]
  );

  const quotes = useQuotes(symbols);

  const data = useMemo(() => {
    if (!cached.data) return undefined;
    return mergeQuotesIntoSummary(cached.data, quotes.data);
  }, [cached.data, quotes.data]);

  return {
    data,
    isLoading: cached.isLoading,
    isError: cached.isError || quotes.isError,
    isRefreshingPrices: quotes.isFetching && !quotes.isLoading,
    lastPriceUpdate: quotes.dataUpdatedAt,
  };
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createPortfolio(name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolios"] }),
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePortfolio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolios"] }),
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      portfolioId,
      transaction,
    }: {
      portfolioId: number;
      transaction: {
        symbol: string;
        type: "buy" | "sell";
        shares: number;
        price_per_share: number;
        date: string;
        notes?: string;
      };
    }) => addTransaction(portfolioId, transaction),
    onMutate: async ({ portfolioId, transaction }) => {
      await qc.cancelQueries({ queryKey: summaryKey(portfolioId) });
      const prev = qc.getQueryData<PortfolioSummary>(summaryKey(portfolioId));
      if (prev) {
        qc.setQueryData(
          summaryKey(portfolioId),
          applyTransactionToSummary(prev, transaction)
        );
      }
      return { prev, symbols: prev?.holdings.map((h) => h.symbol) ?? [] };
    },
    onSuccess: (tx, { portfolioId }, ctx) => {
      qc.setQueryData<Portfolio>(portfolioKey(portfolioId), (old) =>
        old ? { ...old, transactions: [...old.transactions, tx] } : old
      );
      qc.setQueryData<Portfolio[]>(["portfolios"], (old) =>
        old?.map((p) =>
          p.id === portfolioId
            ? { ...p, transactions: [...p.transactions, tx] }
            : p
        )
      );
      void qc.fetchQuery({
        queryKey: summaryKey(portfolioId),
        queryFn: () => getPortfolioSummary(portfolioId, false),
      });
      void qc.invalidateQueries({ queryKey: portfolioKey(portfolioId) });
      void qc.invalidateQueries({ queryKey: ["portfolioPerformance", portfolioId] });
      const symbols = [
        ...new Set([...(ctx?.symbols ?? []), tx.symbol]),
      ];
      refreshLiveQuotes(qc, symbols);
    },
    onError: (_err, { portfolioId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(summaryKey(portfolioId), ctx.prev);
      }
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      portfolioId,
      transactionId,
    }: {
      portfolioId: number;
      transactionId: number;
    }) => deleteTransaction(portfolioId, transactionId),
    onSuccess: (_data, { portfolioId, transactionId }) => {
      const portfolios = qc.getQueryData<Portfolio[]>(["portfolios"]);
      const symbols =
        portfolios
          ?.find((p) => p.id === portfolioId)
          ?.transactions.filter((t) => t.id !== transactionId)
          .map((t) => t.symbol) ?? [];

      qc.setQueryData<Portfolio[]>(["portfolios"], (old) =>
        old?.map((p) =>
          p.id === portfolioId
            ? {
                ...p,
                transactions: p.transactions.filter((t) => t.id !== transactionId),
              }
            : p
        )
      );
      void qc.invalidateQueries({ queryKey: summaryKey(portfolioId) });
      void qc.invalidateQueries({ queryKey: portfolioKey(portfolioId) });
      void qc.invalidateQueries({ queryKey: ["portfolioPerformance", portfolioId] });
      refreshLiveQuotes(qc, [...new Set(symbols)]);
    },
  });
}
