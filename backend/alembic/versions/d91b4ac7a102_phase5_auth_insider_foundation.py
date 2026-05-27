"""phase5_auth_insider_foundation

Revision ID: d91b4ac7a102
Revises: b8f3a2c1d4e5
Create Date: 2026-05-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d91b4ac7a102"
down_revision: Union[str, None] = "b8f3a2c1d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("watchlists", sa.Column("user_id", sa.String(), nullable=True))
    op.create_index("ix_watchlists_user_id", "watchlists", ["user_id"], unique=False)

    op.add_column("portfolios", sa.Column("user_id", sa.String(), nullable=True))
    op.create_index("ix_portfolios_user_id", "portfolios", ["user_id"], unique=False)

    op.create_table(
        "insider_transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("filing_date", sa.DateTime(), nullable=True),
        sa.Column("transaction_date", sa.DateTime(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("share", sa.Float(), nullable=True),
        sa.Column("change", sa.Float(), nullable=True),
        sa.Column("transaction_code", sa.String(), nullable=True),
        sa.Column("transaction_price", sa.Float(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_insider_transactions_id"), "insider_transactions", ["id"], unique=False)
    op.create_index(op.f("ix_insider_transactions_symbol"), "insider_transactions", ["symbol"], unique=False)
    op.create_index(op.f("ix_insider_transactions_filing_date"), "insider_transactions", ["filing_date"], unique=False)

    op.create_table(
        "ownership_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("report_date", sa.DateTime(), nullable=True),
        sa.Column("investor_name", sa.String(), nullable=False),
        sa.Column("share", sa.Float(), nullable=True),
        sa.Column("change", sa.Float(), nullable=True),
        sa.Column("filing_date", sa.DateTime(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ownership_snapshots_id"), "ownership_snapshots", ["id"], unique=False)
    op.create_index(op.f("ix_ownership_snapshots_symbol"), "ownership_snapshots", ["symbol"], unique=False)
    op.create_index(op.f("ix_ownership_snapshots_report_date"), "ownership_snapshots", ["report_date"], unique=False)

    op.create_table(
        "user_notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_notifications_id"), "user_notifications", ["id"], unique=False)
    op.create_index(op.f("ix_user_notifications_user_id"), "user_notifications", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_notifications_type"), "user_notifications", ["type"], unique=False)

    op.create_table(
        "job_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_runs_id"), "job_runs", ["id"], unique=False)
    op.create_index(op.f("ix_job_runs_job_name"), "job_runs", ["job_name"], unique=False)
    op.create_index(op.f("ix_job_runs_status"), "job_runs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_job_runs_status"), table_name="job_runs")
    op.drop_index(op.f("ix_job_runs_job_name"), table_name="job_runs")
    op.drop_index(op.f("ix_job_runs_id"), table_name="job_runs")
    op.drop_table("job_runs")

    op.drop_index(op.f("ix_user_notifications_type"), table_name="user_notifications")
    op.drop_index(op.f("ix_user_notifications_user_id"), table_name="user_notifications")
    op.drop_index(op.f("ix_user_notifications_id"), table_name="user_notifications")
    op.drop_table("user_notifications")

    op.drop_index(op.f("ix_ownership_snapshots_report_date"), table_name="ownership_snapshots")
    op.drop_index(op.f("ix_ownership_snapshots_symbol"), table_name="ownership_snapshots")
    op.drop_index(op.f("ix_ownership_snapshots_id"), table_name="ownership_snapshots")
    op.drop_table("ownership_snapshots")

    op.drop_index(op.f("ix_insider_transactions_filing_date"), table_name="insider_transactions")
    op.drop_index(op.f("ix_insider_transactions_symbol"), table_name="insider_transactions")
    op.drop_index(op.f("ix_insider_transactions_id"), table_name="insider_transactions")
    op.drop_table("insider_transactions")

    op.drop_index("ix_portfolios_user_id", table_name="portfolios")
    op.drop_column("portfolios", "user_id")

    op.drop_index("ix_watchlists_user_id", table_name="watchlists")
    op.drop_column("watchlists", "user_id")
