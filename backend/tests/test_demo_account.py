"""The shared demo account can read but never write."""

import pytest

from app.core.auth import AuthUser, get_current_user
from app.core.config import settings
from app.main import app


@pytest.fixture
def as_demo_user(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_USER_EMAIL", "demo@stockplanner.app")
    app.dependency_overrides[get_current_user] = lambda: AuthUser(
        id="demo-user-id", email="Demo@StockPlanner.app"  # case-insensitive match
    )
    yield
    app.dependency_overrides.pop(get_current_user, None)


class TestDemoAccountReadOnly:
    async def test_demo_user_can_read(self, client, as_demo_user):
        assert (await client.get("/api/watchlists/")).status_code == 200
        assert (await client.get("/api/portfolios/")).status_code == 200

    async def test_demo_user_cannot_write(self, client, as_demo_user):
        assert (await client.post("/api/watchlists/", json={"name": "x"})).status_code == 403
        assert (await client.post("/api/portfolios/", json={"name": "x"})).status_code == 403
        assert (await client.delete("/api/portfolios/1")).status_code == 403
        assert (await client.delete("/api/watchlists/1")).status_code == 403

    async def test_regular_user_unaffected_by_demo_config(
        self, client, as_user, monkeypatch
    ):
        monkeypatch.setattr(settings, "DEMO_USER_EMAIL", "demo@stockplanner.app")
        as_user("regular-user")
        resp = await client.post("/api/portfolios/", json={"name": "mine"})
        assert resp.status_code == 201
