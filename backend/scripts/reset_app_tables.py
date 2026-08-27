"""Drop this app's tables so `alembic upgrade head` can rebuild from scratch.

Use when the database carries tables from an older schema (e.g. a stale
alembic_version revision). Only the tables owned by this app are dropped —
Supabase auth users and any non-app tables are untouched.

    python scripts/reset_app_tables.py --yes
"""

import asyncio
import re
import sys

sys.path.insert(0, ".")

from sqlalchemy import text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import engine  # noqa: E402

APP_TABLES = [
    "alembic_version",
    "watchlist_items",
    "watchlists",
    "transactions",
    "portfolios",
    "insider_transactions",
    "ownership_snapshots",
    "user_notifications",
    "job_runs",
]


async def main() -> None:
    host = re.sub(r"//[^@]*@", "//", settings.DATABASE_URL)
    print(f"Target database: {host}")
    print(f"Tables to drop (data in them is deleted): {', '.join(APP_TABLES)}")
    if "--yes" not in sys.argv:
        print("\nRe-run with --yes to proceed.")
        sys.exit(1)

    async with engine.begin() as conn:
        for table in APP_TABLES:
            await conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
        await conn.execute(text("DROP TYPE IF EXISTS transactiontype"))
    print("Dropped. Now run: alembic upgrade head")


if __name__ == "__main__":
    asyncio.run(main())
