import type { Portfolio, PortfolioSummary } from "@/types";
import api from "./client";

export async function getPortfolios(): Promise<Portfolio[]> {
  const { data } = await api.get<Portfolio[]>("/portfolios/");
  return data;
}

export async function getPortfolio(id: number): Promise<Portfolio> {
  const { data } = await api.get<Portfolio>(`/portfolios/${id}`);
  return data;
}

export async function getPortfolioSummary(id: number): Promise<PortfolioSummary> {
  const { data } = await api.get<PortfolioSummary>(`/portfolios/${id}/summary`);
  return data;
}

export async function createPortfolio(
  name: string,
  description?: string
): Promise<Portfolio> {
  const { data } = await api.post<Portfolio>("/portfolios/", { name, description });
  return data;
}

export async function deletePortfolio(id: number): Promise<void> {
  await api.delete(`/portfolios/${id}`);
}

export async function addTransaction(
  portfolioId: number,
  transaction: {
    symbol: string;
    type: "buy" | "sell";
    shares: number;
    price_per_share: number;
    date: string;
    notes?: string;
  }
): Promise<Portfolio> {
  const { data } = await api.post<Portfolio>(
    `/portfolios/${portfolioId}/transactions`,
    transaction
  );
  return data;
}

export async function deleteTransaction(
  portfolioId: number,
  transactionId: number
): Promise<void> {
  await api.delete(`/portfolios/${portfolioId}/transactions/${transactionId}`);
}
