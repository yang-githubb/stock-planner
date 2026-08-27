from datetime import date, datetime, timedelta

from app.models.portfolio import Transaction, TransactionType
from app.services.portfolio_service import _compute_holdings, _price_on_day


def tx(symbol: str, tx_type: str, shares: float, price: float, day: int = 1) -> Transaction:
    return Transaction(
        symbol=symbol,
        type=TransactionType(tx_type),
        shares=shares,
        price_per_share=price,
        date=datetime(2025, 1, day),
    )


class TestComputeHoldings:
    def test_single_buy(self):
        holdings = _compute_holdings([tx("AAPL", "buy", 10, 100.0)])
        assert holdings["AAPL"]["shares"] == 10
        assert holdings["AAPL"]["total_cost"] == 1000.0
        assert holdings["AAPL"]["realized_pnl"] == 0.0

    def test_multiple_buys_average_cost(self):
        holdings = _compute_holdings(
            [tx("AAPL", "buy", 10, 100.0, day=1), tx("AAPL", "buy", 10, 200.0, day=2)]
        )
        h = holdings["AAPL"]
        assert h["shares"] == 20
        assert h["total_cost"] == 3000.0  # avg cost 150/share

    def test_partial_sell_realizes_pnl_at_average_cost(self):
        holdings = _compute_holdings(
            [
                tx("AAPL", "buy", 10, 100.0, day=1),
                tx("AAPL", "buy", 10, 200.0, day=2),
                tx("AAPL", "sell", 5, 300.0, day=3),
            ]
        )
        h = holdings["AAPL"]
        assert h["shares"] == 15
        # avg cost was 150: realized = 5 * (300 - 150)
        assert h["realized_pnl"] == 750.0
        # remaining cost basis: 3000 - 5 * 150
        assert h["total_cost"] == 2250.0

    def test_sell_everything_keeps_realized_pnl_row(self):
        holdings = _compute_holdings(
            [tx("AAPL", "buy", 10, 100.0, day=1), tx("AAPL", "sell", 10, 150.0, day=2)]
        )
        h = holdings["AAPL"]
        assert h["shares"] == 0
        assert h["realized_pnl"] == 500.0

    def test_closed_position_with_no_pnl_is_dropped(self):
        holdings = _compute_holdings(
            [tx("AAPL", "buy", 10, 100.0, day=1), tx("AAPL", "sell", 10, 100.0, day=2)]
        )
        assert "AAPL" not in holdings

    def test_transactions_processed_in_date_order_regardless_of_input_order(self):
        holdings = _compute_holdings(
            [
                tx("AAPL", "sell", 5, 200.0, day=3),
                tx("AAPL", "buy", 10, 100.0, day=1),
            ]
        )
        h = holdings["AAPL"]
        assert h["shares"] == 5
        assert h["realized_pnl"] == 500.0

    def test_symbols_tracked_independently(self):
        holdings = _compute_holdings(
            [tx("AAPL", "buy", 10, 100.0), tx("MSFT", "buy", 5, 300.0)]
        )
        assert holdings["AAPL"]["total_cost"] == 1000.0
        assert holdings["MSFT"]["total_cost"] == 1500.0


class TestPriceOnDay:
    series = {
        date(2025, 1, 3): 100.0,  # Friday
        date(2025, 1, 6): 110.0,  # Monday
    }

    def test_exact_trading_day(self):
        assert _price_on_day(self.series, date(2025, 1, 6)) == 110.0

    def test_weekend_uses_previous_close(self):
        assert _price_on_day(self.series, date(2025, 1, 4)) == 100.0
        assert _price_on_day(self.series, date(2025, 1, 5)) == 100.0

    def test_day_before_history_returns_none(self):
        assert _price_on_day(self.series, date(2025, 1, 1)) is None

    def test_empty_series_returns_none(self):
        assert _price_on_day({}, date(2025, 1, 6)) is None

    def test_long_gap_falls_back_to_earliest_known_price(self):
        # Documented approximation: after probing 10 days back without a
        # match, the earliest known close is used rather than returning None.
        far_future = date(2025, 1, 6) + timedelta(days=30)
        assert _price_on_day({date(2025, 1, 3): 100.0}, far_future) == 100.0
