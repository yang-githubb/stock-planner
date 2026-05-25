from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioResponse,
    PortfolioSummaryResponse,
    TransactionCreate,
)
from app.services import portfolio_service

router = APIRouter(prefix="/api/portfolios", tags=["portfolios"])


@router.get("/", response_model=list[PortfolioResponse])
async def get_portfolios(db: AsyncSession = Depends(get_db)):
    return await portfolio_service.list_portfolios(db)


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    return await portfolio_service.get_portfolio(db, portfolio_id)


@router.get("/{portfolio_id}/summary", response_model=PortfolioSummaryResponse)
async def get_portfolio_summary(
    portfolio_id: int, db: AsyncSession = Depends(get_db)
):
    return await portfolio_service.get_portfolio_summary(db, portfolio_id)


@router.post("/", response_model=PortfolioResponse, status_code=201)
async def create_portfolio(
    data: PortfolioCreate, db: AsyncSession = Depends(get_db)
):
    return await portfolio_service.create_portfolio(db, data.name, data.description)


@router.delete("/{portfolio_id}", status_code=204)
async def delete_portfolio(
    portfolio_id: int, db: AsyncSession = Depends(get_db)
):
    await portfolio_service.delete_portfolio(db, portfolio_id)


@router.post(
    "/{portfolio_id}/transactions",
    response_model=PortfolioResponse,
    status_code=201,
)
async def add_transaction(
    portfolio_id: int,
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
):
    return await portfolio_service.add_transaction(
        db,
        portfolio_id,
        data.symbol,
        data.type,
        data.shares,
        data.price_per_share,
        data.date,
        data.notes,
    )


@router.delete("/{portfolio_id}/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    portfolio_id: int,
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
):
    await portfolio_service.delete_transaction(db, portfolio_id, transaction_id)
