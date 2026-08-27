import { X } from "lucide-react";
import { dismissToast, useToasts } from "@/lib/toast";

export function ErrorToasts() {
  const toasts = useToasts();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm shadow-lg dark:border-rose-800 dark:bg-rose-950/60"
        >
          <p className="flex-1 text-rose-800 dark:text-rose-200">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-rose-400 hover:text-rose-600"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
