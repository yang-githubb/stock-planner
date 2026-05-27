import asyncio

import httpx
from app.core.config import settings
from app.core.cache import cache

FINNHUB_BASE = "https://finnhub.io/api/v1"

QUOTE_TTL = 15
PROFILE_TTL = 3600
NEWS_TTL = 300
SEARCH_TTL = 300
CANDLE_TTL = 300


def _params(**kwargs: str) -> dict:
    return {"token": settings.FINNHUB_API_KEY, **kwargs}


def _check_api_key() -> None:
    if not settings.FINNHUB_API_KEY:
        raise ValueError(
            "FINNHUB_API_KEY is not configured. "
            "Set it in your .env file — get a free key at https://finnhub.io/"
        )


class SymbolNotFound(Exception):
    pass


async def search_symbols(query: str) -> list[dict]:
    _check_api_key()
    key = f"search:{query.lower()}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/search", params=_params(q=query)
        )
        resp.raise_for_status()
        data = resp.json()

    result = data.get("result", [])
    cache.set(key, result, SEARCH_TTL)
    return result


async def get_quote(symbol: str) -> dict:
    _check_api_key()
    key = f"quote:{symbol.upper()}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/quote", params=_params(symbol=symbol)
        )
        resp.raise_for_status()
        data = resp.json()

    if data.get("c") is None or data.get("c") == 0 and data.get("pc") == 0:
        raise SymbolNotFound(
            f"No quote data for '{symbol}'. "
            "The free Finnhub tier only covers US stocks."
        )

    result = {
        "symbol": symbol,
        "current_price": data.get("c", 0),
        "change": data.get("d", 0),
        "percent_change": data.get("dp", 0),
        "high": data.get("h", 0),
        "low": data.get("l", 0),
        "open": data.get("o", 0),
        "previous_close": data.get("pc", 0),
    }
    cache.set(key, result, QUOTE_TTL)
    return result


def get_cached_quote(symbol: str) -> dict | None:
    """Return a cached quote only — never calls Finnhub."""
    return cache.get(f"quote:{symbol.upper()}")


def get_quotes_cached_only(symbols: list[str]) -> dict[str, dict]:
    """Read quotes from in-memory cache only (15s TTL). Misses are omitted."""
    unique = list(dict.fromkeys(s.upper() for s in symbols if s.strip()))
    result: dict[str, dict] = {}
    for sym in unique:
        quote = get_cached_quote(sym)
        if quote is not None:
            result[sym] = quote
    return result


async def get_quotes(symbols: list[str]) -> dict[str, dict]:
    """Fetch multiple quotes in parallel (cache hits are instant)."""
    unique = list(dict.fromkeys(s.upper() for s in symbols if s.strip()))
    if not unique:
        return {}

    async def fetch_one(sym: str) -> tuple[str, dict | None]:
        try:
            return sym, await get_quote(sym)
        except Exception:
            return sym, None

    pairs = await asyncio.gather(*(fetch_one(sym) for sym in unique))
    return {sym: quote for sym, quote in pairs if quote is not None}


async def get_company_profile(symbol: str) -> dict:
    _check_api_key()
    key = f"profile:{symbol.upper()}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/stock/profile2", params=_params(symbol=symbol)
        )
        resp.raise_for_status()
        data = resp.json()

    if not data:
        raise SymbolNotFound(
            f"No profile data for '{symbol}'. "
            "The free Finnhub tier only covers US stocks."
        )

    result = {
        "symbol": data.get("ticker", symbol),
        "name": data.get("name", ""),
        "exchange": data.get("exchange", ""),
        "industry": data.get("finnhubIndustry", ""),
        "logo": data.get("logo", ""),
        "market_cap": data.get("marketCapitalization", 0),
        "share_outstanding": data.get("shareOutstanding", 0),
        "website": data.get("weburl", ""),
    }
    cache.set(key, result, PROFILE_TTL)
    return result


async def get_market_news(category: str = "general") -> list[dict]:
    _check_api_key()
    key = f"market_news:{category}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/news", params=_params(category=category)
        )
        resp.raise_for_status()

    result = resp.json()[:20]
    cache.set(key, result, NEWS_TTL)
    return result


async def get_company_news(
    symbol: str, from_date: str, to_date: str
) -> list[dict]:
    _check_api_key()
    key = f"company_news:{symbol.upper()}:{from_date}:{to_date}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/company-news",
            params=_params(symbol=symbol, **{"from": from_date, "to": to_date}),
        )
        resp.raise_for_status()

    result = resp.json()[:20]
    cache.set(key, result, NEWS_TTL)
    return result


YAHOO_INTERVALS = {
    "D": "1d",
    "W": "1wk",
    "M": "1mo",
}


async def get_stock_candles(
    symbol: str, resolution: str, from_ts: int, to_ts: int
) -> list[dict]:
    """Fetch OHLCV candle data from Yahoo Finance (free, no key required)."""
    key = f"candles:{symbol.upper()}:{resolution}:{from_ts}:{to_ts}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    interval = YAHOO_INTERVALS.get(resolution, "1d")
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        f"?period1={from_ts}&period2={to_ts}&interval={interval}"
    )
    headers = {"User-Agent": "Mozilla/5.0"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        raise SymbolNotFound(f"No candle data available for '{symbol}'.")

    data = resp.json()
    chart_result = data.get("chart", {}).get("result")
    if not chart_result:
        return []

    chart = chart_result[0]
    timestamps = chart.get("timestamp", [])
    ohlcv = chart.get("indicators", {}).get("quote", [{}])[0]

    candles = []
    for i in range(len(timestamps)):
        o = ohlcv.get("open", [None])[i]
        h = ohlcv.get("high", [None])[i]
        lo = ohlcv.get("low", [None])[i]
        c = ohlcv.get("close", [None])[i]
        v = ohlcv.get("volume", [None])[i]
        if o is None or c is None:
            continue
        candles.append(
            {
                "time": timestamps[i],
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(lo, 2),
                "close": round(c, 2),
                "volume": v or 0,
            }
        )

    cache.set(key, candles, CANDLE_TTL)
    return candles


async def get_insider_transactions(symbol: str, from_date: str, to_date: str) -> list[dict]:
    _check_api_key()
    key = f"insiders:{symbol.upper()}:{from_date}:{to_date}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/stock/insider-transactions",
            params=_params(symbol=symbol.upper(), **{"from": from_date, "to": to_date}),
        )
        resp.raise_for_status()
        data = resp.json()

    result = data.get("data", []) if isinstance(data, dict) else []
    cache.set(key, result, NEWS_TTL)
    return result


async def get_institutional_ownership(
    symbol: str, from_date: str, to_date: str
) -> list[dict]:
    _check_api_key()
    key = f"ownership:{symbol.upper()}:{from_date}:{to_date}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/institutional/ownership",
            params=_params(
                symbol=symbol.upper(),
                cusip="",
                **{"from": from_date, "to": to_date},
            ),
        )
        resp.raise_for_status()
        data = resp.json()

    result = data.get("data", []) if isinstance(data, dict) else []
    cache.set(key, result, 3600)
    return result
