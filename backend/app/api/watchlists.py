from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.watchlist import (
    WatchlistCreate,
    WatchlistItemCreate,
    WatchlistItemUpdate,
    WatchlistItemResponse,
    WatchlistResponse,
)
from app.services import watchlist_service

router = APIRouter(prefix="/api/watchlists", tags=["watchlists"])


@router.get("/", response_model=list[WatchlistResponse])
async def get_watchlists(db: AsyncSession = Depends(get_db)):
    return await watchlist_service.list_watchlists(db)


@router.post("/", response_model=WatchlistResponse, status_code=201)
async def create_watchlist(
    data: WatchlistCreate, db: AsyncSession = Depends(get_db)
):
    return await watchlist_service.create_watchlist(db, data.name)


@router.delete("/{watchlist_id}", status_code=204)
async def delete_watchlist(
    watchlist_id: int, db: AsyncSession = Depends(get_db)
):
    await watchlist_service.delete_watchlist(db, watchlist_id)


@router.post(
    "/{watchlist_id}/items",
    response_model=WatchlistItemResponse,
    status_code=201,
)
async def add_item(
    watchlist_id: int,
    data: WatchlistItemCreate,
    db: AsyncSession = Depends(get_db),
):
    return await watchlist_service.add_item(
        db, watchlist_id, data.symbol, data.notes
    )


@router.patch(
    "/{watchlist_id}/items/{item_id}",
    response_model=WatchlistResponse,
)
async def update_item(
    watchlist_id: int,
    item_id: int,
    data: WatchlistItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await watchlist_service.update_item_notes(
        db, watchlist_id, item_id, data.notes
    )


@router.delete("/{watchlist_id}/items/{item_id}", status_code=204)
async def remove_item(
    watchlist_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
):
    await watchlist_service.remove_item(db, watchlist_id, item_id)
