"""Create and seed the read-only demo account.

Run locally from backend/ (needs backend/.env for DATABASE_URL):

    python scripts/seed_demo_account.py \
        --supabase-url https://<PROJECT_REF>.supabase.co \
        --anon-key <publishable anon key> \
        --email demo@example.com \
        --password <choose a password>

The script signs the demo user up in Supabase (or signs in if it already
exists), then seeds a watchlist and a portfolio with sample transactions for
that user. Afterwards set DEMO_USER_EMAIL=<email> in backend/.env so the API
rejects writes from this account, and VITE_DEMO_EMAIL=<email> in
frontend/.env so the UI shows the read-only banner.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timedelta

import httpx

sys.path.insert(0, ".")

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.models import Portfolio, Transaction, Watchlist, WatchlistItem  # noqa: E402
from app.models.portfolio import TransactionType  # noqa: E402


def get_demo_user_id(supabase_url: str, anon_key: str, email: str, password: str) -> str:
    headers = {"apikey": anon_key, "Content-Type": "application/json"}
    auth = supabase_url.rstrip("/") + "/auth/v1"
    creds = {"email": email, "password": password}

    signup = httpx.post(f"{auth}/signup", headers=headers, json=creds, timeout=20)
    if signup.status_code == 200:
        body = signup.json()
        user = body.get("user") or body
        if user.get("id") and (user.get("identities") or body.get("access_token")):
            print(f"Created Supabase user {email}")
            return user["id"]

    signin = httpx.post(
        f"{auth}/token", params={"grant_type": "password"}, headers=headers, json=creds, timeout=20
    )
    if signin.status_code == 200:
        print(f"Signed in existing Supabase user {email}")
        return signin.json()["user"]["id"]

    raise SystemExit(
        f"Could not create or sign in {email}.\n"
        f"  signup  -> HTTP {signup.status_code}: {signup.text[:300]}\n"
        f"  sign-in -> HTTP {signin.status_code}: {signin.text[:300]}\n"
        "Likely causes:\n"
        "  - The account already exists with a different password: delete it in the "
        "Supabase dashboard (Authentication -> Users) and re-run.\n"
        "  - Email confirmation is enabled: confirm the user in the dashboard and "
        "re-run, or disable 'Confirm email' under Authentication -> Providers -> Email.\n"
        "  - Email signups are disabled: enable the Email provider in the dashboard."
    )


async def seed(user_id: str) -> None:
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        existing = await db.execute(select(Watchlist.id).where(Watchlist.user_id == user_id))
        if existing.first():
            print("Demo user already has data; nothing to seed.")
            return

        watchlist = Watchlist(name="Tech Watchlist", user_id=user_id)
        watchlist.items = [
            WatchlistItem(symbol="AAPL", notes="Core holding, watching services growth"),
            WatchlistItem(symbol="NVDA", notes="AI infrastructure demand"),
            WatchlistItem(symbol="MSFT", notes=None),
            WatchlistItem(symbol="TSLA", notes="Volatile - watch deliveries"),
        ]
        db.add(watchlist)

        portfolio = Portfolio(
            name="Demo Portfolio",
            description="Sample long-term portfolio seeded for the demo account",
            user_id=user_id,
        )
        db.add(portfolio)
        await db.flush()

        today = datetime.utcnow()
        buys = [
            ("AAPL", 20, 168.40, 340), ("AAPL", 10, 189.20, 200),
            ("MSFT", 12, 402.75, 320), ("NVDA", 25, 94.60, 300),
            ("NVDA", 10, 132.15, 150), ("TSLA", 15, 248.30, 260),
        ]
        for symbol, shares, price, days_ago in buys:
            db.add(Transaction(
                portfolio_id=portfolio.id, symbol=symbol,
                type=TransactionType.BUY, shares=shares, price_per_share=price,
                date=today - timedelta(days=days_ago),
            ))
        db.add(Transaction(
            portfolio_id=portfolio.id, symbol="NVDA",
            type=TransactionType.SELL, shares=8, price_per_share=171.90,
            date=today - timedelta(days=45), notes="Trimmed position",
        ))

        await db.commit()
        print("Seeded: 1 watchlist (4 symbols), 1 portfolio (7 transactions).")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--supabase-url", required=True)
    parser.add_argument("--anon-key", required=True)
    parser.add_argument("--email", default="demo@stockplanner.app")
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    user_id = get_demo_user_id(args.supabase_url, args.anon_key, args.email, args.password)
    asyncio.run(seed(user_id))
    print(
        "\nNext steps:\n"
        f"  1. backend/.env  -> DEMO_USER_EMAIL={args.email}\n"
        f"  2. frontend/.env -> VITE_DEMO_EMAIL={args.email}\n"
        "  3. Restart both servers. Signing in with the demo credentials now "
        "shows seeded data and blocks all writes."
    )


if __name__ == "__main__":
    main()
