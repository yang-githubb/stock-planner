import { useSyncExternalStore } from "react";

export interface Toast {
  id: number;
  message: string;
}

const AUTO_DISMISS_MS = 5000;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function pushToast(message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => toasts
  );
}
