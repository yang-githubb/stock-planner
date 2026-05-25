import { useState } from "react";
import { Star, Plus, Trash2, X, Pencil, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StockCard } from "@/components/stocks/StockCard";
import { SymbolSearch } from "@/components/stocks/SymbolSearch";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useWatchlists,
  useCreateWatchlist,
  useDeleteWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useUpdateItemNotes,
} from "@/hooks/useWatchlists";

export default function WatchlistPage() {
  const { data: watchlists, isLoading } = useWatchlists();
  const createWatchlist = useCreateWatchlist();
  const deleteWatchlist = useDeleteWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const updateNotes = useUpdateItemNotes();

  const [newName, setNewName] = useState("");
  const [addSymbol, setAddSymbol] = useState<Record<number, string>>({});
  const [editingNotes, setEditingNotes] = useState<{ itemId: number; watchlistId: number; value: string } | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim()) {
      createWatchlist.mutate(newName.trim());
      setNewName("");
    }
  }

  function handleAddSymbol(watchlistId: number) {
    const symbol = addSymbol[watchlistId]?.trim().toUpperCase();
    if (symbol) {
      addToWatchlist.mutate({ watchlistId, symbol });
      setAddSymbol((prev) => ({ ...prev, [watchlistId]: "" }));
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Watchlists
        </h1>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="New watchlist name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-48"
          />
          <Button type="submit" size="md" disabled={!newName.trim()}>
            <Plus size={16} /> Create
          </Button>
        </form>
      </div>

      {(!watchlists || watchlists.length === 0) && (
        <EmptyState
          icon={<Star size={48} />}
          title="No watchlists yet"
          description="Create a watchlist to start tracking your favorite stocks."
        />
      )}

      {watchlists?.map((wl) => (
        <Card key={wl.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              {wl.name}
              <span className="text-sm font-normal text-gray-400">
                ({wl.items.length} stock{wl.items.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteWatchlist.mutate(wl.id)}
              title="Delete watchlist"
            >
              <Trash2 size={16} className="text-gray-400 hover:text-rose-500" />
            </Button>
          </CardHeader>

          <div className="mb-4 flex gap-2">
            <SymbolSearch
              value={addSymbol[wl.id] ?? ""}
              onChange={(symbol) =>
                setAddSymbol((prev) => ({ ...prev, [wl.id]: symbol }))
              }
              placeholder="Search stock to add..."
              className="max-w-xs"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleAddSymbol(wl.id)}
              disabled={!addSymbol[wl.id]?.trim()}
            >
              <Plus size={16} /> Add
            </Button>
          </div>

          {wl.items.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
              No stocks in this watchlist yet. Add some above!
            </p>
          ) : (
            <div className="space-y-3">
              {wl.items.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <StockCard symbol={item.symbol} />
                    </div>
                    <button
                      onClick={() =>
                        setEditingNotes(
                          editingNotes?.itemId === item.id
                            ? null
                            : { itemId: item.id, watchlistId: wl.id, value: item.notes ?? "" }
                        )
                      }
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-500 dark:hover:bg-indigo-900/20"
                      title="Edit notes"
                    >
                      {item.notes ? <MessageSquare size={18} /> : <Pencil size={18} />}
                    </button>
                    <button
                      onClick={() =>
                        removeFromWatchlist.mutate({
                          watchlistId: wl.id,
                          itemId: item.id,
                        })
                      }
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                      title="Remove from watchlist"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {item.notes && editingNotes?.itemId !== item.id && (
                    <p className="ml-2 text-xs text-gray-500 dark:text-gray-400 italic">
                      {item.notes}
                    </p>
                  )}
                  {editingNotes?.itemId === item.id && (
                    <div className="ml-2 flex gap-2">
                      <Input
                        placeholder="Add a note..."
                        value={editingNotes.value}
                        onChange={(e) =>
                          setEditingNotes({ ...editingNotes, value: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            updateNotes.mutate({
                              watchlistId: editingNotes.watchlistId,
                              itemId: editingNotes.itemId,
                              notes: editingNotes.value.trim() || null,
                            });
                            setEditingNotes(null);
                          }
                          if (e.key === "Escape") setEditingNotes(null);
                        }}
                        className="max-w-sm text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          updateNotes.mutate({
                            watchlistId: editingNotes.watchlistId,
                            itemId: editingNotes.itemId,
                            notes: editingNotes.value.trim() || null,
                          });
                          setEditingNotes(null);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
