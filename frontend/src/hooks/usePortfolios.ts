import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPortfolios,
  getPortfolioSummary,
  createPortfolio,
  deletePortfolio,
  addTransaction,
  deleteTransaction,
} from "@/api/portfolios";

export function usePortfolios() {
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: getPortfolios,
  });
}

export function usePortfolioSummary(id: number) {
  return useQuery({
    queryKey: ["portfolioSummary", id],
    queryFn: () => getPortfolioSummary(id),
    enabled: id > 0,
    refetchInterval: 60_000,
  });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolios"] });
      qc.invalidateQueries({ queryKey: ["portfolioSummary"] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolios"] });
      qc.invalidateQueries({ queryKey: ["portfolioSummary"] });
    },
  });
}
