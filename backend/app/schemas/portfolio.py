from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class TransactionCreate(BaseModel):
    symbol: str
    type: str  # "buy" or "sell"
    shares: float
    price_per_share: float
    date: datetime
    notes: str | None = None

    @field_validator("date")
    @classmethod
    def strip_timezone(cls, v: datetime) -> datetime:
        # DB uses TIMESTAMP WITHOUT TIME ZONE; asyncpg rejects aware datetimes.
        if v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v


class TransactionResponse(BaseModel):
    id: int
    portfolio_id: int
    symbol: str
    type: str
    shares: float
    price_per_share: float
    date: datetime
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PortfolioCreate(BaseModel):
    name: str
    description: str | None = None


class PortfolioResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime
    transactions: list[TransactionResponse]

    model_config = ConfigDict(from_attributes=True)


class HoldingResponse(BaseModel):
    symbol: str
    shares: float
    avg_cost: float
    total_cost: float
    current_price: float | None = None
    market_value: float | None = None
    unrealized_pnl: float | None = None
    unrealized_pnl_pct: float | None = None


class PortfolioSummaryResponse(BaseModel):
    id: int
    name: str
    description: str | None
    total_invested: float
    total_market_value: float | None
    total_unrealized_pnl: float | None
    total_realized_pnl: float
    holdings: list[HoldingResponse]


class PerformancePoint(BaseModel):
    time: int
    market_value: float
    cost_basis: float


class PortfolioPerformanceResponse(BaseModel):
    points: list[PerformancePoint]
