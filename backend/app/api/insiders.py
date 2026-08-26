from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user
from app.core.database import get_db
from app.schemas.insider import InsiderTransactionResponse, OwnershipSnapshotResponse
from app.services import insider_service

router = APIRouter(prefix="/api/insiders", tags=["insiders"])


@router.post("/{symbol}/ingest", status_code=202)
async def ingest_symbol(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    try:
        counts = await insider_service.ingest_symbol(db, symbol.upper())
        return {"ok": True, **counts}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/{symbol}/transactions", response_model=list[InsiderTransactionResponse])
async def get_symbol_transactions(symbol: str, db: AsyncSession = Depends(get_db)):
    rows = await insider_service.get_recent_insider_transactions(db, symbol.upper(), limit=200)
    if not rows:
        try:
            await insider_service.ingest_symbol(db, symbol.upper())
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))
        rows = await insider_service.get_recent_insider_transactions(db, symbol.upper(), limit=200)
    return rows


@router.get("/{symbol}/ownership", response_model=list[OwnershipSnapshotResponse])
async def get_symbol_ownership(symbol: str, db: AsyncSession = Depends(get_db)):
    rows = await insider_service.get_recent_ownership_snapshots(db, symbol.upper(), limit=100)
    if not rows:
        try:
            await insider_service.ingest_symbol(db, symbol.upper())
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc))
        rows = await insider_service.get_recent_ownership_snapshots(db, symbol.upper(), limit=100)
    return rows


@router.get("/feed/me")
async def my_watchlist_feed(
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    symbols = await insider_service.watchlist_symbols_for_user(db, user.id)
    feed: dict[str, list[InsiderTransactionResponse]] = {}
    for sym in symbols:
        txns = await insider_service.get_recent_insider_transactions(db, sym, limit=25)
        if not txns:
            try:
                await insider_service.ingest_symbol(db, sym)
            except Exception:
                pass
            txns = await insider_service.get_recent_insider_transactions(db, sym, limit=25)
        feed[sym] = [InsiderTransactionResponse.model_validate(t, from_attributes=True) for t in txns]
    return {"symbols": symbols, "feed": feed}
