from __future__ import annotations

import json
from collections import defaultdict

from fastapi import WebSocket


class RealtimeManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[user_id].add(ws)

    def disconnect(self, user_id: str, ws: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(ws)
        if not sockets:
            self._connections.pop(user_id, None)

    async def send(self, user_id: str, event: str, payload: dict) -> None:
        sockets = list(self._connections.get(user_id, []))
        dead: list[WebSocket] = []
        body = json.dumps({"event": event, "payload": payload})
        for ws in sockets:
            try:
                await ws.send_text(body)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)


realtime_manager = RealtimeManager()
