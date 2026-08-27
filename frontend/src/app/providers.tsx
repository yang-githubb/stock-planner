import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { pushToast } from "@/lib/toast";

function describeMutationError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) return "Please sign in to do that.";
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Something went wrong. Please try again.";
}

const queryClient = new QueryClient({
  // Every failed mutation surfaces a toast; per-mutation onError handlers
  // (e.g. optimistic rollbacks) still run in addition to this.
  mutationCache: new MutationCache({
    onError: (error) => pushToast(describeMutationError(error)),
  }),
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
