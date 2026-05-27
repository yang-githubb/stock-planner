from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.realtime import realtime_manager
from app.models.watchlist import Watchlist
from app.services import insider_service

scheduler: AsyncIOScheduler | None = None


async def _ingest_watchlist_symbols_job() -> None:
    async with AsyncSessionLocal() as db:
        symbols = await insider_service.all_watchlist_symbols(db)
        if not symbols:
            return
        await insider_service.run_ingestion_job(db, symbols)
        result = await db.execute(
            select(Watchlist.user_id).distinct().where(Watchlist.user_id.isnot(None))
        )
        for user_id in [u for u in result.scalars().all() if u]:
            await realtime_manager.send(
                user_id,
                "insider_ingestion_completed",
                {"symbols": symbols, "count": len(symbols)},
            )


def start_jobs() -> None:
    global scheduler
    if scheduler is not None or not settings.JOBS_ENABLED:
        return
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _ingest_watchlist_symbols_job,
        "interval",
        minutes=max(5, settings.INSIDER_INGEST_INTERVAL_MINUTES),
        id="insider_ingestion",
        replace_existing=True,
    )
    scheduler.start()


def stop_jobs() -> None:
    global scheduler
    if scheduler is None:
        return
    scheduler.shutdown(wait=False)
    scheduler = None
