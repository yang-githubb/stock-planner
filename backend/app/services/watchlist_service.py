from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.watchlist import Watchlist, WatchlistItem


async def list_watchlists(db: AsyncSession) -> list[Watchlist]:
    result = await db.execute(
        select(Watchlist).options(selectinload(Watchlist.items))
    )
    return list(result.scalars().all())


async def create_watchlist(db: AsyncSession, name: str) -> Watchlist:
    watchlist = Watchlist(name=name)
    db.add(watchlist)
    await db.commit()
    await db.refresh(watchlist, ["items"])
    return watchlist


async def delete_watchlist(db: AsyncSession, watchlist_id: int) -> None:
    result = await db.execute(
        select(Watchlist).where(Watchlist.id == watchlist_id)
    )
    watchlist = result.scalar_one_or_none()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    await db.delete(watchlist)
    await db.commit()


async def add_item(
    db: AsyncSession, watchlist_id: int, symbol: str, notes: str | None = None
) -> Watchlist:
    result = await db.execute(
        select(Watchlist)
        .options(selectinload(Watchlist.items))
        .where(Watchlist.id == watchlist_id)
    )
    watchlist = result.scalar_one_or_none()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    existing = [item.symbol for item in watchlist.items]
    if symbol.upper() in existing:
        raise HTTPException(
            status_code=409, detail="Symbol already in watchlist"
        )

    item = WatchlistItem(
        watchlist_id=watchlist_id,
        symbol=symbol.upper(),
        notes=notes,
    )
    db.add(item)
    await db.commit()
    await db.refresh(watchlist, ["items"])
    return watchlist


async def remove_item(
    db: AsyncSession, watchlist_id: int, item_id: int
) -> None:
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id,
            WatchlistItem.watchlist_id == watchlist_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()


async def update_item_notes(
    db: AsyncSession, watchlist_id: int, item_id: int, notes: str | None
) -> Watchlist:
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id,
            WatchlistItem.watchlist_id == watchlist_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.notes = notes
    await db.commit()

    wl_result = await db.execute(
        select(Watchlist)
        .options(selectinload(Watchlist.items))
        .where(Watchlist.id == watchlist_id)
    )
    return wl_result.scalar_one()
