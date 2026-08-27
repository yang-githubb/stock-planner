from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user, get_writable_user
from app.core.database import get_db
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioPerformanceResponse,
    PortfolioResponse,
    PortfolioSummaryResponse,
    TransactionCreate,
    TransactionResponse,
)
from app.services import portfolio_service

router = APIRouter(prefix="/api/portfolios", tags=["portfolios"])


@router.get("/", response_model=list[PortfolioResponse])
async def get_portfolios(
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    return await portfolio_service.list_portfolios(db, user.id)


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: int,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    return await portfolio_service.get_portfolio(db, portfolio_id, user.id)


@router.get("/{portfolio_id}/performance", response_model=PortfolioPerformanceResponse)
async def get_portfolio_performance(
    portfolio_id: int,
    days: int = 365,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    return await portfolio_service.get_portfolio_performance(
        db, portfolio_id, days, user.id
    )


@router.get("/{portfolio_id}/summary", response_model=PortfolioSummaryResponse)
async def get_portfolio_summary(
    portfolio_id: int,
    live_prices: bool = False,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    return await portfolio_service.get_portfolio_summary(
        db, portfolio_id, live_prices=live_prices, user_id=user.id
    )


@router.post("/", response_model=PortfolioResponse, status_code=201)
async def create_portfolio(
    data: PortfolioCreate,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_writable_user),
):
    return await portfolio_service.create_portfolio(
        db, data.name, data.description, user.id
    )


@router.delete("/{portfolio_id}", status_code=204)
async def delete_portfolio(
    portfolio_id: int,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_writable_user),
):
    await portfolio_service.delete_portfolio(db, portfolio_id, user.id)


@router.post(
    "/{portfolio_id}/transactions",
    response_model=TransactionResponse,
    status_code=201,
)
async def add_transaction(
    portfolio_id: int,
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_writable_user),
):
    tx = await portfolio_service.add_transaction(
        db,
        portfolio_id,
        data.symbol,
        data.type,
        data.shares,
        data.price_per_share,
        data.date,
        data.notes,
        user.id,
    )
    return TransactionResponse(
        id=tx.id,
        portfolio_id=tx.portfolio_id,
        symbol=tx.symbol,
        type=tx.type.value,
        shares=tx.shares,
        price_per_share=tx.price_per_share,
        date=tx.date,
        notes=tx.notes,
        created_at=tx.created_at,
    )


@router.delete("/{portfolio_id}/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    portfolio_id: int,
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(get_writable_user),
):
    await portfolio_service.delete_transaction(
        db, portfolio_id, transaction_id, user.id
    )
