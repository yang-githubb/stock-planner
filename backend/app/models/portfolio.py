from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class TransactionType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    transactions = relationship(
        "Transaction", back_populates="portfolio", cascade="all, delete-orphan"
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol = Column(String, nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    shares = Column(Float, nullable=False)
    price_per_share = Column(Float, nullable=False)
    date = Column(DateTime, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    portfolio = relationship("Portfolio", back_populates="transactions")
