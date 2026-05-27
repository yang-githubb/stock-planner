from datetime import datetime

from pydantic import BaseModel


class InsiderTransactionResponse(BaseModel):
    symbol: str
    filing_date: datetime | None = None
    transaction_date: datetime | None = None
    name: str | None = None
    share: float | None = None
    change: float | None = None
    transaction_code: str | None = None
    transaction_price: float | None = None


class OwnershipSnapshotResponse(BaseModel):
    symbol: str
    report_date: datetime | None = None
    investor_name: str
    share: float | None = None
    change: float | None = None
    filing_date: datetime | None = None
