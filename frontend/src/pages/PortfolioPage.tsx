import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PortfolioDetail } from "@/components/portfolio/PortfolioDetail";
import {
  usePortfolios,
  useCreatePortfolio,
  useDeletePortfolio,
} from "@/hooks/usePortfolios";
import { useAuth } from "@/context/AuthContext";

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  const buySymbol = searchParams.get("buy") ?? undefined;
  const buyPrice = searchParams.get("price") ?? undefined;

  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (buySymbol && searchParams.has("buy")) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim()) {
      createPortfolio.mutate({ name: newName.trim() });
      setNewName("");
    }
  }

  const activePortfolio = selectedId ?? portfolios?.[0]?.id ?? null;

  if (authLoading || isLoading) return <PageSpinner />;

  if (!user) {
    return (
      <EmptyState
        icon={<Briefcase size={48} />}
        title="Sign in to track your portfolio"
        description="Portfolios are private to your account. Sign in from the navbar to create one."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Portfolio
        </h1>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="New portfolio name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-48"
          />
          <Button type="submit" size="md" disabled={!newName.trim()}>
            <Plus size={16} /> Create
          </Button>
        </form>
      </div>

      {(!portfolios || portfolios.length === 0) ? (
        <EmptyState
          icon={<Briefcase size={48} />}
          title="No portfolios yet"
          description="Create a portfolio to start tracking your investments and P&L."
          action={
            buySymbol ? (
              <Button
                variant="primary"
                onClick={() => createPortfolio.mutate({ name: "My Portfolio" })}
              >
                <Plus size={16} /> Create Portfolio & Record Buy
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {portfolios.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <Button
                  variant={activePortfolio === p.id ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setSelectedId(p.id)}
                >
                  {p.name}
                </Button>
                <button
                  onClick={() => {
                    deletePortfolio.mutate(p.id);
                    if (selectedId === p.id) setSelectedId(null);
                  }}
                  className="rounded p-1 text-gray-400 hover:text-rose-500"
                  title="Delete portfolio"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {activePortfolio && (
            <PortfolioDetail
              portfolioId={activePortfolio}
              initialSymbol={buySymbol}
              initialPrice={buyPrice}
            />
          )}
        </>
      )}
    </div>
  );
}
