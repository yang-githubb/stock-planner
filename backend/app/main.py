from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_access_token
from app.core.config import settings
from app.core.database import get_db
from app.core.jobs import start_jobs, stop_jobs
from app.core.realtime import realtime_manager
from app.models import (
    Watchlist,
    WatchlistItem,
    Portfolio,
    Transaction,
    InsiderTransaction,
    OwnershipSnapshot,
    UserNotification,
    JobRun,
)  # noqa: F401
from app.api import stocks, watchlists, portfolios, insiders, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic only (alembic upgrade head)
    start_jobs()
    yield
    stop_jobs()


app = FastAPI(title="Stock Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(watchlists.router)
app.include_router(portfolios.router)
app.include_router(insiders.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/api/health")
async def health(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "connected"}


@app.websocket("/ws/notifications")
async def ws_notifications(ws: WebSocket):
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=1008, reason="Missing token")
        return
    try:
        user = await verify_access_token(token)
    except Exception:
        await ws.close(code=1008, reason="Invalid token")
        return

    await realtime_manager.connect(user.id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        realtime_manager.disconnect(user.id, ws)
