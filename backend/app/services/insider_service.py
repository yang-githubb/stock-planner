from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.phase5 import InsiderTransaction, OwnershipSnapshot, JobRun
from app.models.watchlist import WatchlistItem, Watchlist
from app.services import finnhub_service


def _date_key(d: datetime | None) -> str | None:
    if d is None:
        return None
    return d.date().isoformat()


def insider_transaction_fingerprint(
    symbol: str,
    filing_date: datetime | None,
    transaction_date: datetime | None,
    name: str | None,
    change: float | None,
    transaction_code: str | None,
    transaction_price: float | None,
    share: float | None,
) -> tuple:
    """Stable identity for one insider line (dedupe repeated ingests)."""
    return (
        symbol.upper(),
        (name or "").strip().upper(),
        _date_key(filing_date),
        _date_key(transaction_date),
        None if change is None else round(float(change), 4),
        (transaction_code or "").strip().upper(),
        None if transaction_price is None else round(float(transaction_price), 4),
        None if share is None else round(float(share), 4),
    )


def _fingerprint_from_row_dict(symbol: str, row: dict) -> tuple:
    return insider_transaction_fingerprint(
        symbol,
        row.get("filing_date"),
        row.get("transaction_date"),
        row.get("name"),
        row.get("change"),
        row.get("transaction_code"),
        row.get("transaction_price"),
        row.get("share"),
    )


def _fingerprint_from_orm(t: InsiderTransaction) -> tuple:
    return insider_transaction_fingerprint(
        t.symbol,
        t.filing_date,
        t.transaction_date,
        t.name,
        t.change,
        t.transaction_code,
        t.transaction_price,
        t.share,
    )


async def _existing_insider_fingerprints(db: AsyncSession, symbol: str) -> set[tuple]:
    result = await db.execute(
        select(
            InsiderTransaction.filing_date,
            InsiderTransaction.transaction_date,
            InsiderTransaction.name,
            InsiderTransaction.change,
            InsiderTransaction.transaction_code,
            InsiderTransaction.transaction_price,
            InsiderTransaction.share,
        ).where(InsiderTransaction.symbol == symbol.upper())
    )
    sym = symbol.upper()
    return {
        insider_transaction_fingerprint(sym, fd, td, name, ch, code, price, sh)
        for fd, td, name, ch, code, price, sh in result.all()
    }


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


async def fetch_insider_transactions(symbol: str, days: int = 365) -> list[dict]:
    to_date = datetime.utcnow().date()
    from_date = to_date - timedelta(days=days)
    rows = await finnhub_service.get_insider_transactions(
        symbol=symbol,
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
    )
    result: list[dict] = []
    for r in rows:
        result.append(
            {
                "symbol": symbol.upper(),
                "filing_date": _parse_dt(r.get("filingDate")),
                "transaction_date": _parse_dt(r.get("transactionDate")),
                "name": r.get("name"),
                "share": r.get("share"),
                "change": r.get("change"),
                "transaction_code": r.get("transactionCode"),
                "transaction_price": r.get("transactionPrice"),
            }
        )
    return result


async def fetch_ownership_snapshots(symbol: str, days: int = 365) -> list[dict]:
    from_date = (datetime.utcnow().date() - timedelta(days=days)).isoformat()
    to_date = datetime.utcnow().date().isoformat()
    rows = await finnhub_service.get_institutional_ownership(
        symbol, from_date=from_date, to_date=to_date
    )
    result: list[dict] = []
    for r in rows:
        result.append(
            {
                "symbol": symbol.upper(),
                "report_date": _parse_dt(r.get("reportDate")),
                "investor_name": r.get("name") or "Unknown",
                "share": r.get("share"),
                "change": r.get("change"),
                "filing_date": _parse_dt(r.get("filingDate")),
            }
        )
    return result


def _ownership_fingerprint(row: dict) -> tuple:
    return (
        row["symbol"],
        (row.get("investor_name") or "").strip().upper(),
        _date_key(row.get("report_date")),
        _date_key(row.get("filing_date")),
        None if row.get("share") is None else round(float(row["share"]), 4),
        None if row.get("change") is None else round(float(row["change"]), 4),
    )


async def _existing_ownership_fingerprints(db: AsyncSession, symbol: str) -> set[tuple]:
    result = await db.execute(
        select(
            OwnershipSnapshot.investor_name,
            OwnershipSnapshot.report_date,
            OwnershipSnapshot.filing_date,
            OwnershipSnapshot.share,
            OwnershipSnapshot.change,
        ).where(OwnershipSnapshot.symbol == symbol.upper())
    )
    sym = symbol.upper()
    return {
        _ownership_fingerprint(
            {
                "symbol": sym,
                "investor_name": name,
                "report_date": rd,
                "filing_date": fd,
                "share": share,
                "change": change,
            }
        )
        for name, rd, fd, share, change in result.all()
    }


async def ingest_symbol(db: AsyncSession, symbol: str) -> dict[str, int]:
    insiders = await fetch_insider_transactions(symbol)
    # Ownership endpoints can be access-limited on the Finnhub free tier.
    # We keep insider ingestion working even if ownership fails.
    try:
        ownership = await fetch_ownership_snapshots(symbol)
    except Exception:
        ownership = []

    existing = await _existing_insider_fingerprints(db, symbol.upper())

    inserted_insiders = 0
    for row in insiders:
        fp = _fingerprint_from_row_dict(symbol, row)
        if fp in existing:
            continue
        existing.add(fp)
        db.add(InsiderTransaction(**row))
        inserted_insiders += 1

    existing_ownership = await _existing_ownership_fingerprints(db, symbol.upper())
    inserted_ownership = 0
    for row in ownership:
        fp = _ownership_fingerprint(row)
        if fp in existing_ownership:
            continue
        existing_ownership.add(fp)
        db.add(OwnershipSnapshot(**row))
        inserted_ownership += 1

    await db.commit()
    return {"insiders": inserted_insiders, "ownership": inserted_ownership}


async def get_recent_insider_transactions(db: AsyncSession, symbol: str, limit: int = 50) -> list[InsiderTransaction]:
    fetch_cap = min(max(limit * 12, limit), 3000)
    q = (
        select(InsiderTransaction)
        .where(InsiderTransaction.symbol == symbol.upper())
        .order_by(InsiderTransaction.filing_date.desc().nullslast(), InsiderTransaction.id.desc())
        .limit(fetch_cap)
    )
    rows = await db.execute(q)
    raw = list(rows.scalars().all())
    seen: set[tuple] = set()
    out: list[InsiderTransaction] = []
    for t in raw:
        fp = _fingerprint_from_orm(t)
        if fp in seen:
            continue
        seen.add(fp)
        out.append(t)
        if len(out) >= limit:
            break
    return out


async def get_recent_ownership_snapshots(db: AsyncSession, symbol: str, limit: int = 50) -> list[OwnershipSnapshot]:
    q = (
        select(OwnershipSnapshot)
        .where(OwnershipSnapshot.symbol == symbol.upper())
        .order_by(OwnershipSnapshot.report_date.desc().nullslast(), OwnershipSnapshot.id.desc())
        .limit(limit)
    )
    rows = await db.execute(q)
    return list(rows.scalars().all())


async def watchlist_symbols_for_user(db: AsyncSession, user_id: str) -> list[str]:
    q = (
        select(WatchlistItem.symbol)
        .join(Watchlist, Watchlist.id == WatchlistItem.watchlist_id)
        .where(Watchlist.user_id == user_id)
    )
    rows = await db.execute(q)
    return sorted({s.upper() for s in rows.scalars().all()})


async def all_watchlist_symbols(db: AsyncSession) -> list[str]:
    rows = await db.execute(select(WatchlistItem.symbol).distinct())
    return sorted({s.upper() for s in rows.scalars().all() if s})


async def run_ingestion_job(db: AsyncSession, symbols: Iterable[str]) -> None:
    run = JobRun(job_name="insider_ingestion", status="running")
    db.add(run)
    await db.commit()
    await db.refresh(run)
    try:
        total = 0
        for symbol in symbols:
            counts = await ingest_symbol(db, symbol)
            total += counts["insiders"] + counts["ownership"]
        run.status = "success"
        run.message = f"Processed {total} records"
    except Exception as exc:
        run.status = "failed"
        run.message = str(exc)
    run.finished_at = datetime.utcnow()
    await db.commit()
