from datetime import datetime
from pydantic import BaseModel, ConfigDict


class WatchlistItemCreate(BaseModel):
    symbol: str
    notes: str | None = None


class WatchlistItemUpdate(BaseModel):
    notes: str | None = None


class WatchlistItemResponse(BaseModel):
    id: int
    watchlist_id: int
    symbol: str
    added_at: datetime
    notes: str | None

    model_config = ConfigDict(from_attributes=True)


class WatchlistCreate(BaseModel):
    name: str


class WatchlistResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    items: list[WatchlistItemResponse]

    model_config = ConfigDict(from_attributes=True)
