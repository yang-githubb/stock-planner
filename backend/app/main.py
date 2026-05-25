from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.models import Watchlist, WatchlistItem, Portfolio, Transaction  # noqa: F401 – registers models
from app.api import stocks, watchlists, portfolios


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
async def health():
    return {"status": "healthy"}
