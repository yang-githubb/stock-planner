import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from app.core.config import settings
from app.services import finnhub_service
from app.services.finnhub_service import SymbolNotFound

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/trending")
async def get_trending():
    return {"symbols": settings.TRENDING_SYMBOLS}


@router.get("/search")
async def search_stocks(q: str):
    try:
        results = await finnhub_service.search_symbols(q)
        return {"results": results}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Finnhub API error: {e}")


@router.get("/market/news")
async def get_market_news():
    try:
        news = await finnhub_service.get_market_news()
        return {"news": news}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Finnhub API error: {e}")


@router.get("/{symbol}/quote")
async def get_stock_quote(symbol: str):
    try:
        quote = await finnhub_service.get_quote(symbol.upper())
        return quote
    except SymbolNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Finnhub API error: {e}")


@router.get("/{symbol}/profile")
async def get_company_profile(symbol: str):
    try:
        profile = await finnhub_service.get_company_profile(symbol.upper())
        return profile
    except SymbolNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Finnhub API error: {e}")


@router.get("/{symbol}/candles")
async def get_stock_candles(
    symbol: str, resolution: str = "D", from_ts: int = 0, to_ts: int = 0
):
    try:
        candles = await finnhub_service.get_stock_candles(
            symbol.upper(), resolution, from_ts, to_ts
        )
        return {"candles": candles}
    except SymbolNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Candle fetch failed for %s", symbol)
        raise HTTPException(status_code=502, detail=f"Finnhub API error: {e}")


@router.get("/{symbol}/news")
async def get_stock_news(symbol: str):
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        news = await finnhub_service.get_company_news(
            symbol.upper(), month_ago, today
        )
        return {"news": news}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Finnhub API error: {e}")
