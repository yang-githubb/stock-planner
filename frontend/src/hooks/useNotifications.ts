import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/authToken";
import type { RealtimeEvent } from "@/types";

function wsUrl(token: string) {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}/ws/notifications?token=${encodeURIComponent(token)}`;
}

export function useNotifications(enabled: boolean) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const token = getAccessToken();
    if (!token) return;

    const ws = new WebSocket(wsUrl(token));
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as RealtimeEvent;
        setEvents((prev) => [parsed, ...prev].slice(0, 20));
      } catch {
        /* ignore malformed */
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled]);

  function dismiss(index: number) {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  }

  return { events, dismiss };
}
