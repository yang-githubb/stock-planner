import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationToasts() {
  const { user } = useAuth();
  const { events, dismiss } = useNotifications(!!user);

  if (!events.length) return null;

  return (
    <div className="fixed bottom-24 left-4 z-40 flex max-w-sm flex-col gap-2">
      {events.map((ev, i) => (
        <div
          key={`${ev.event}-${i}`}
          className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {ev.event === "insider_ingestion_completed"
                ? "Insider data updated"
                : ev.event}
            </p>
            {ev.event === "insider_ingestion_completed" &&
              Array.isArray(ev.payload.symbols) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(ev.payload.symbols as string[]).join(", ")}
                </p>
              )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(i)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
