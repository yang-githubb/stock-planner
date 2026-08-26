from sqlalchemy import Column, DateTime, Float, Integer, String, func

from app.core.database import Base


class InsiderTransaction(Base):
    __tablename__ = "insider_transactions"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    filing_date = Column(DateTime, nullable=True, index=True)
    transaction_date = Column(DateTime, nullable=True)
    name = Column(String, nullable=True)
    share = Column(Float, nullable=True)
    change = Column(Float, nullable=True)
    transaction_code = Column(String, nullable=True)
    transaction_price = Column(Float, nullable=True)
    source = Column(String, nullable=False, default="finnhub")
    created_at = Column(DateTime, server_default=func.now())


class OwnershipSnapshot(Base):
    __tablename__ = "ownership_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    report_date = Column(DateTime, nullable=True, index=True)
    investor_name = Column(String, nullable=False)
    share = Column(Float, nullable=True)
    change = Column(Float, nullable=True)
    filing_date = Column(DateTime, nullable=True)
    source = Column(String, nullable=False, default="finnhub")
    created_at = Column(DateTime, server_default=func.now())
