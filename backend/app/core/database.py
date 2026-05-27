import ssl

import certifi
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

from app.core.config import settings


def _is_supabase_pooler(url: str) -> bool:
    return "pooler.supabase.com" in url or ":6543/" in url


def _connect_args() -> dict:
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    if url.startswith("postgresql"):
        args: dict = {}
        # Transaction pooler (port 6543) only — not needed for direct :5432
        if _is_supabase_pooler(url):
            args["statement_cache_size"] = 0

        if settings.DATABASE_SSL_VERIFY:
            ctx = ssl.create_default_context(cafile=certifi.where())
            args["ssl"] = ctx
        else:
            # Dev only: set DATABASE_SSL_VERIFY=false if corporate proxy breaks cert chain
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            args["ssl"] = ctx

        return args
    return {}


def _engine_kwargs() -> dict:
    url = settings.DATABASE_URL
    kwargs: dict = {"echo": False, "connect_args": _connect_args()}
    if url.startswith("postgresql"):
        kwargs["pool_pre_ping"] = True
        if _is_supabase_pooler(url):
            # PgBouncer transaction mode: don't hold connections across requests
            kwargs["poolclass"] = NullPool
        else:
            # Direct Supabase / Postgres: reuse connections (much faster for dev)
            kwargs["pool_size"] = 5
            kwargs["max_overflow"] = 10
    return kwargs


engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs())

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
