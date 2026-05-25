from pydantic import BaseModel


class StockQuote(BaseModel):
    symbol: str
    current_price: float
    change: float
    percent_change: float
    high: float
    low: float
    open: float
    previous_close: float


class CompanyProfile(BaseModel):
    symbol: str
    name: str
    exchange: str
    industry: str
    logo: str
    market_cap: float
    share_outstanding: float
    website: str


class StockSearchResult(BaseModel):
    symbol: str
    description: str
    type: str


class MarketNews(BaseModel):
    id: int
    category: str
    headline: str
    summary: str
    url: str
    image: str
    source: str
    datetime: int
