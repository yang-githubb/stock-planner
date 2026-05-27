from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.watchlist import Watchlist, WatchlistItem


def _watchlist_scope_query(user_id: str | None):
    q = select(Watchlist).options(selectinload(Watchlist.items))
    if user_id:
        # Include legacy rows created before auth (user_id was NULL)
        q = q.where(or_(Watchlist.user_id == user_id, Watchlist.user_id.is_(None)))
    return q


async def list_watchlists(db: AsyncSession, user_id: str | None = None) -> list[Watchlist]:
    result = await db.execute(_watchlist_scope_query(user_id))
    return list(result.scalars().all())


async def create_watchlist(db: AsyncSession, name: str, user_id: str | None = None) -> Watchlist:
    watchlist = Watchlist(name=name, user_id=user_id)
    db.add(watchlist)
    await db.commit()
    await db.refresh(watchlist, ["items"])
    return watchlist


async def delete_watchlist(db: AsyncSession, watchlist_id: int, user_id: str | None = None) -> None:
    q = select(Watchlist).where(Watchlist.id == watchlist_id)
    if user_id:
        q = q.where(Watchlist.user_id == user_id)
    result = await db.execute(q)
    watchlist = result.scalar_one_or_none()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    await db.delete(watchlist)
    await db.commit()


async def add_item(
    db: AsyncSession,
    watchlist_id: int,
    symbol: str,
    notes: str | None = None,
    user_id: str | None = None,
) -> WatchlistItem:
    q = select(Watchlist.id).where(Watchlist.id == watchlist_id)
    if user_id:
        q = q.where(Watchlist.user_id == user_id)
    result = await db.execute(q)
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    dup = await db.execute(
        select(WatchlistItem.id).where(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.symbol == symbol.upper(),
        )
    )
    if dup.scalar_one_or_none() is not None:
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
    await db.refresh(item)
    return item


async def remove_item(
    db: AsyncSession, watchlist_id: int, item_id: int, user_id: str | None = None
) -> None:
    q = (
        select(WatchlistItem)
        .join(Watchlist, Watchlist.id == WatchlistItem.watchlist_id)
        .where(
            WatchlistItem.id == item_id,
            WatchlistItem.watchlist_id == watchlist_id,
        )
    )
    if user_id:
        q = q.where(Watchlist.user_id == user_id)
    result = await db.execute(q)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()


async def update_item_notes(
    db: AsyncSession,
    watchlist_id: int,
    item_id: int,
    notes: str | None,
    user_id: str | None = None,
) -> Watchlist:
    q = (
        select(WatchlistItem)
        .join(Watchlist, Watchlist.id == WatchlistItem.watchlist_id)
        .where(
            WatchlistItem.id == item_id,
            WatchlistItem.watchlist_id == watchlist_id,
        )
    )
    if user_id:
        q = q.where(Watchlist.user_id == user_id)
    result = await db.execute(q)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.notes = notes
    await db.commit()

    wl_query = (
        select(Watchlist)
        .options(selectinload(Watchlist.items))
        .where(Watchlist.id == watchlist_id)
    )
    if user_id:
        wl_query = wl_query.where(Watchlist.user_id == user_id)
    wl_result = await db.execute(wl_query)
    return wl_result.scalar_one()
