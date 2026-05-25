from collections import defaultdict
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.portfolio import Portfolio, Transaction, TransactionType
from app.services import finnhub_service


async def list_portfolios(db: AsyncSession) -> list[Portfolio]:
    result = await db.execute(
        select(Portfolio).options(selectinload(Portfolio.transactions))
    )
    return list(result.scalars().all())


async def get_portfolio(db: AsyncSession, portfolio_id: int) -> Portfolio:
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.transactions))
        .where(Portfolio.id == portfolio_id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


async def create_portfolio(
    db: AsyncSession, name: str, description: str | None = None
) -> Portfolio:
    portfolio = Portfolio(name=name, description=description)
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio, ["transactions"])
    return portfolio


async def delete_portfolio(db: AsyncSession, portfolio_id: int) -> None:
    portfolio = await get_portfolio(db, portfolio_id)
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
) -> Portfolio:
    portfolio = await get_portfolio(db, portfolio_id)

    if tx_type not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="Type must be 'buy' or 'sell'")

    if shares <= 0:
        raise HTTPException(status_code=400, detail="Shares must be positive")

    if price_per_share < 0:
        raise HTTPException(status_code=400, detail="Price must be non-negative")

    if tx_type == "sell":
        holdings = _compute_holdings(portfolio.transactions)
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
    await db.refresh(portfolio, ["transactions"])
    return portfolio


async def delete_transaction(
    db: AsyncSession, portfolio_id: int, transaction_id: int
) -> None:
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.portfolio_id == portfolio_id,
        )
    )
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


async def get_portfolio_summary(db: AsyncSession, portfolio_id: int) -> dict:
    portfolio = await get_portfolio(db, portfolio_id)
    all_holdings = _compute_holdings(portfolio.transactions)

    holdings_list = []
    total_invested = 0.0
    total_market_value = 0.0
    total_realized = 0.0
    has_prices = True

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

        try:
            quote = await finnhub_service.get_quote(symbol)
            current_price = quote["current_price"]
            market_value = current_price * data["shares"]
            unrealized_pnl = market_value - data["total_cost"]
            unrealized_pnl_pct = (unrealized_pnl / data["total_cost"] * 100) if data["total_cost"] > 0 else 0
            total_market_value += market_value
        except Exception:
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
