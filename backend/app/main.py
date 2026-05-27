from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import Watchlist, WatchlistItem, Portfolio, Transaction  # noqa: F401 – registers models
from app.api import stocks, watchlists, portfolios


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic only (alembic upgrade head)
    yield


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


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/api/health")
async def health(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "connected"}
