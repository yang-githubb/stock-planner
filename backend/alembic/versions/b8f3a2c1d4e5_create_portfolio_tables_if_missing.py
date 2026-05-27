"""create_portfolio_tables_if_missing

Revision ID: b8f3a2c1d4e5
Revises: 09f65f67182c
Create Date: 2026-05-27

The prior 09f65f67182c migration was applied with an empty upgrade().
This migration creates portfolio tables when they are missing.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8f3a2c1d4e5"
down_revision: Union[str, None] = "09f65f67182c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

transaction_type = sa.Enum("buy", "sell", name="transactiontype", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if "portfolios" not in existing:
        op.create_table(
            "portfolios",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_portfolios_id"), "portfolios", ["id"], unique=False)

    if "transactions" not in existing:
        op.create_table(
            "transactions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("portfolio_id", sa.Integer(), nullable=False),
            sa.Column("symbol", sa.String(), nullable=False),
            sa.Column("type", transaction_type, nullable=False),
            sa.Column("shares", sa.Float(), nullable=False),
            sa.Column("price_per_share", sa.Float(), nullable=False),
            sa.Column("date", sa.DateTime(), nullable=False),
            sa.Column("notes", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
            sa.ForeignKeyConstraint(["portfolio_id"], ["portfolios.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_transactions_id"), "transactions", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_transactions_id"), table_name="transactions")
    op.drop_table("transactions")
    op.drop_index(op.f("ix_portfolios_id"), table_name="portfolios")
    op.drop_table("portfolios")
    sa.Enum(name="transactiontype").drop(op.get_bind(), checkfirst=True)
