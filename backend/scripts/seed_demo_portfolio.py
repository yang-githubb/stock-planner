"""
Seed a demo portfolio with historical transactions for chart testing.

Run from backend/:
  python scripts/seed_demo_portfolio.py
"""
import asyncio
from datetime import datetime

from sqlalchemy import delete, select, text

from app.core.database import AsyncSessionLocal
from app.models.portfolio import Portfolio, Transaction, TransactionType

PORTFOLIO_NAME = "Demo Historical Portfolio"

# Trades from Nov 2025 through today (adjust last dates if re-running later)
TRANSACTIONS = [
    ("AAPL", "buy", 15, 225.00, "2025-11-04"),
    ("MSFT", "buy", 8, 415.00, "2025-11-18"),
    ("GOOGL", "buy", 6, 175.00, "2025-12-02"),
    ("AAPL", "buy", 5, 240.00, "2025-12-16"),
    ("NVDA", "buy", 10, 138.00, "2026-01-06"),
    ("MSFT", "buy", 4, 428.00, "2026-01-20"),
    ("AAPL", "sell", 5, 255.00, "2026-02-03"),
    ("GOOGL", "buy", 4, 188.00, "2026-02-17"),
    ("NVDA", "buy", 5, 125.00, "2026-03-03"),
    ("MSFT", "sell", 3, 445.00, "2026-03-17"),
    ("AAPL", "buy", 8, 218.00, "2026-04-01"),
    ("NVDA", "sell", 4, 132.00, "2026-04-15"),
    ("GOOGL", "sell", 3, 195.00, "2026-04-28"),
    ("MSFT", "buy", 6, 455.00, "2026-05-12"),
    ("AAPL", "buy", 5, 205.00, "2026-05-27"),
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(Portfolio).where(Portfolio.name == PORTFOLIO_NAME)
        )
        portfolio = existing.scalar_one_or_none()

        if portfolio:
            await db.execute(
                delete(Transaction).where(Transaction.portfolio_id == portfolio.id)
            )
            print(f"Reset transactions on portfolio id={portfolio.id} ({PORTFOLIO_NAME})")
        else:
            portfolio = Portfolio(
                name=PORTFOLIO_NAME,
                description="Auto-seeded dummy data for portfolio value chart",
            )
            db.add(portfolio)
            await db.flush()
            print(f"Created portfolio id={portfolio.id} ({PORTFOLIO_NAME})")

        for symbol, tx_type, shares, price, day in TRANSACTIONS:
            db.add(
                Transaction(
                    portfolio_id=portfolio.id,
                    symbol=symbol,
                    type=TransactionType.BUY if tx_type == "buy" else TransactionType.SELL,
                    shares=shares,
                    price_per_share=price,
                    date=datetime.strptime(day, "%Y-%m-%d"),
                    notes="Demo seed",
                )
            )

        await db.commit()

        row = await db.execute(
            text(
                """
                SELECT COUNT(*), MIN(date)::date, MAX(date)::date
                FROM transactions WHERE portfolio_id = :pid
                """
            ),
            {"pid": portfolio.id},
        )
        count, first_day, last_day = row.one()
        print(f"Inserted {count} transactions from {first_day} to {last_day}")
        print(f"Open app > Portfolio > select '{PORTFOLIO_NAME}' > chart range 1Y or All")


if __name__ == "__main__":
    asyncio.run(seed())
