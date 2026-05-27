import asyncio
from collections import defaultdict
from datetime import date, datetime, timedelta, time as dt_time

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.portfolio import Portfolio, Transaction, TransactionType
from app.services import finnhub_service


async def list_portfolios(db: AsyncSession, user_id: str | None = None) -> list[Portfolio]:
    q = select(Portfolio).options(selectinload(Portfolio.transactions))
    if user_id:
        q = q.where(or_(Portfolio.user_id == user_id, Portfolio.user_id.is_(None)))
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_portfolio(db: AsyncSession, portfolio_id: int, user_id: str | None = None) -> Portfolio:
    q = (
        select(Portfolio)
        .options(selectinload(Portfolio.transactions))
        .where(Portfolio.id == portfolio_id)
    )
    if user_id:
        q = q.where(or_(Portfolio.user_id == user_id, Portfolio.user_id.is_(None)))
    result = await db.execute(q)
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


async def create_portfolio(
    db: AsyncSession, name: str, description: str | None = None, user_id: str | None = None
) -> Portfolio:
    portfolio = Portfolio(name=name, description=description, user_id=user_id)
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio, ["transactions"])
    return portfolio


async def delete_portfolio(db: AsyncSession, portfolio_id: int, user_id: str | None = None) -> None:
    portfolio = await get_portfolio(db, portfolio_id, user_id)
    await db.delete(portfolio)
    await db.commit()


async def add_transaction(
    db: AsyncSession,
    portfolio_id: int,
    symbol: str,
    tx_type: str,
    shares: float,
    price_per_share: float,
    date,
    notes: str | None = None,
    user_id: str | None = None,
) -> Transaction:
    q = select(Portfolio.id).where(Portfolio.id == portfolio_id)
    if user_id:
        q = q.where(or_(Portfolio.user_id == user_id, Portfolio.user_id.is_(None)))
    exists = await db.execute(q)
    if exists.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if tx_type not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="Type must be 'buy' or 'sell'")

    if shares <= 0:
        raise HTTPException(status_code=400, detail="Shares must be positive")

    if price_per_share < 0:
        raise HTTPException(status_code=400, detail="Price must be non-negative")

    if tx_type == "sell":
        result = await db.execute(
            select(Transaction).where(Transaction.portfolio_id == portfolio_id)
        )
        holdings = _compute_holdings(list(result.scalars().all()))
        current_shares = holdings.get(symbol.upper(), {}).get("shares", 0)
        if shares > current_shares:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot sell {shares} shares of {symbol.upper()} — only {current_shares} held",
            )

    transaction = Transaction(
        portfolio_id=portfolio_id,
        symbol=symbol.upper(),
        type=TransactionType(tx_type),
        shares=shares,
        price_per_share=price_per_share,
        date=date,
        notes=notes,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


async def delete_transaction(
    db: AsyncSession,
    portfolio_id: int,
    transaction_id: int,
    user_id: str | None = None,
) -> None:
    q = (
        select(Transaction)
        .join(Portfolio, Portfolio.id == Transaction.portfolio_id)
        .where(
            Transaction.id == transaction_id,
            Transaction.portfolio_id == portfolio_id,
        )
    )
    if user_id:
        q = q.where(or_(Portfolio.user_id == user_id, Portfolio.user_id.is_(None)))
    result = await db.execute(q)
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.delete(transaction)
    await db.commit()


def _compute_holdings(transactions: list[Transaction]) -> dict:
    """Compute current holdings from transaction history using average cost method."""
    holdings: dict[str, dict] = defaultdict(
        lambda: {"shares": 0.0, "total_cost": 0.0, "realized_pnl": 0.0}
    )

    sorted_txns = sorted(transactions, key=lambda t: t.date)

    for tx in sorted_txns:
        h = holdings[tx.symbol]
        if tx.type == TransactionType.BUY:
            h["total_cost"] += tx.shares * tx.price_per_share
            h["shares"] += tx.shares
        elif tx.type == TransactionType.SELL:
            if h["shares"] > 0:
                avg_cost = h["total_cost"] / h["shares"]
                h["total_cost"] -= tx.shares * avg_cost
                h["realized_pnl"] += tx.shares * (tx.price_per_share - avg_cost)
                h["shares"] -= tx.shares

    return {k: v for k, v in holdings.items() if v["shares"] > 0.001 or abs(v["realized_pnl"]) > 0.001}


def _tx_date(tx: Transaction) -> date:
    d = tx.date
    return d.date() if isinstance(d, datetime) else d


def _candles_to_price_map(candles: list[dict]) -> dict[date, float]:
    series: dict[date, float] = {}
    for c in candles:
        day = datetime.utcfromtimestamp(c["time"]).date()
        series[day] = c["close"]
    return series


def _price_on_day(series: dict[date, float], day: date) -> float | None:
    if not series:
        return None
    probe = day
    earliest = min(series)
    for _ in range(10):
        if probe in series:
            return series[probe]
        if probe < earliest:
            return None
        probe -= timedelta(days=1)
    return series.get(earliest)


async def get_portfolio_performance(
    db: AsyncSession, portfolio_id: int, days: int = 365, user_id: str | None = None
) -> dict:
    """Reconstruct daily portfolio value from transactions + historical closes."""
    portfolio = await get_portfolio(db, portfolio_id, user_id)
    txns = sorted(portfolio.transactions, key=lambda t: t.date)
    if not txns:
        return {"points": []}

    days = max(30, min(days, 1825))
    end_day = date.today()
    first_day = _tx_date(txns[0])
    start_day = max(first_day, end_day - timedelta(days=days))

    symbols = sorted({t.symbol for t in txns})
    from_ts = int(datetime.combine(start_day, dt_time.min).timestamp())
    to_ts = int(datetime.combine(end_day, dt_time.max).timestamp())

    async def fetch_prices(sym: str) -> tuple[str, dict[date, float]]:
        try:
            candles = await finnhub_service.get_stock_candles(sym, "D", from_ts, to_ts)
            return sym, _candles_to_price_map(candles)
        except Exception:
            return sym, {}

    price_maps = dict(await asyncio.gather(*(fetch_prices(s) for s in symbols)))

    points: list[dict] = []
    day = start_day
    while day <= end_day:
        relevant = [t for t in txns if _tx_date(t) <= day]
        holdings = _compute_holdings(relevant)

        market_value = 0.0
        cost_basis = 0.0
        for sym, data in holdings.items():
            if data["shares"] < 0.001:
                continue
            cost_basis += data["total_cost"]
            price = _price_on_day(price_maps.get(sym, {}), day)
            if price is not None:
                market_value += data["shares"] * price

        if market_value > 0 or cost_basis > 0:
            points.append(
                {
                    "time": int(datetime.combine(day, dt_time.min).timestamp()),
                    "market_value": round(market_value, 2),
                    "cost_basis": round(cost_basis, 2),
                }
            )
        day += timedelta(days=1)

    return {"points": points}


async def get_portfolio_summary(
    db: AsyncSession,
    portfolio_id: int,
    *,
    live_prices: bool = False,
    user_id: str | None = None,
) -> dict:
    portfolio = await get_portfolio(db, portfolio_id, user_id)
    all_holdings = _compute_holdings(portfolio.transactions)

    active_symbols = [
        symbol
        for symbol, data in all_holdings.items()
        if data["shares"] >= 0.001
    ]
    if live_prices:
        quotes = await finnhub_service.get_quotes(active_symbols)
    else:
        quotes = finnhub_service.get_quotes_cached_only(active_symbols)

    holdings_list = []
    total_invested = 0.0
    total_market_value = 0.0
    total_realized = 0.0
    has_prices = bool(active_symbols) and len(quotes) == len(active_symbols)

    for symbol, data in all_holdings.items():
        total_realized += data["realized_pnl"]

        if data["shares"] < 0.001:
            continue

        avg_cost = data["total_cost"] / data["shares"] if data["shares"] > 0 else 0
        total_invested += data["total_cost"]

        current_price = None
        market_value = None
        unrealized_pnl = None
        unrealized_pnl_pct = None

        quote = quotes.get(symbol)
        if quote:
            current_price = quote["current_price"]
            market_value = current_price * data["shares"]
            unrealized_pnl = market_value - data["total_cost"]
            unrealized_pnl_pct = (unrealized_pnl / data["total_cost"] * 100) if data["total_cost"] > 0 else 0
            total_market_value += market_value
        elif symbol in active_symbols:
            has_prices = False

        holdings_list.append({
            "symbol": symbol,
            "shares": round(data["shares"], 4),
            "avg_cost": round(avg_cost, 2),
            "total_cost": round(data["total_cost"], 2),
            "current_price": round(current_price, 2) if current_price else None,
            "market_value": round(market_value, 2) if market_value else None,
            "unrealized_pnl": round(unrealized_pnl, 2) if unrealized_pnl is not None else None,
            "unrealized_pnl_pct": round(unrealized_pnl_pct, 2) if unrealized_pnl_pct is not None else None,
        })

    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "description": portfolio.description,
        "total_invested": round(total_invested, 2),
        "total_market_value": round(total_market_value, 2) if has_prices else None,
        "total_unrealized_pnl": round(total_market_value - total_invested, 2) if has_prices else None,
        "total_realized_pnl": round(total_realized, 2),
        "holdings": holdings_list,
    }
