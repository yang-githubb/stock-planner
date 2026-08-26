# StockPlanner

A modern stock research and portfolio tracking platform.

## Features

- **Stock Search** — Search by symbol or company name with live dropdown results (Finnhub API)
- **Stock Detail** — Real-time quotes, company profiles, interactive candlestick/line charts, and news
- **Chart Indicators** — Toggle SMA(20), SMA(50), EMA(12), and RSI(14) overlays directly on the price chart
- **Compare** — Side-by-side normalised % return chart and quote table for up to 4 symbols at once
- **Watchlists** — Create multiple watchlists, add/remove stocks, attach notes to items
- **Portfolio Tracking** — Record buy/sell transactions, track holdings with live P&L (realized & unrealized)
- **Portfolio Value Chart** — Historical portfolio market value vs cost basis over time
- **Portfolio Allocation** — Donut chart showing each holding's share of the total portfolio market value
- **Stock Expert Chat** — Floating chat drawer backed by OpenAI tool-calling (quotes, news, portfolio)
- **Insider & Ownership** — Insider filings on stock detail; watchlist insider feed when signed in
- **Supabase Auth** — Email/password sign-in; watchlists, portfolios, and chat are private per user and require sign-in
- **Realtime notifications** — WebSocket toasts when background insider ingestion completes
- **Dashboard** — Trending stocks, watchlist overview, and market news feed
- **Dark Mode** — System-based dark mode support

## Tech Stack

**Frontend:**
- React 19, TypeScript, Vite
- TailwindCSS (dark mode)
- TanStack Query v5 (data fetching with caching & retry)
- lightweight-charts (TradingView charting)

**Backend:**
- FastAPI (async)
- SQLAlchemy + Alembic (async PostgreSQL via **Supabase**)
- Pydantic v2 + pydantic-settings
- In-memory TTL cache for Finnhub rate limiting

## Project Structure

```
stock-planner/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (stocks, watchlists, portfolios)
│   │   ├── core/         # Config, database, cache
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── services/     # Business logic (finnhub, watchlist, portfolio)
│   ├── alembic/          # Database migrations
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios API client functions
│   │   ├── app/          # Router, providers
│   │   ├── components/   # UI primitives, layout, stock components
│   │   ├── hooks/        # TanStack Query hooks
│   │   ├── pages/        # Page components
│   │   └── types/        # TypeScript interfaces
│   └── package.json
│
├── .env.example
└── .gitignore
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Finnhub API key](https://finnhub.io/)
- A free [Supabase](https://supabase.com) project (PostgreSQL database)

### Quick start (local dev)

1. Clone the repo and create your Python/Node envs:
   - `cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt`
   - `cd frontend && npm install`
2. In Supabase, grab a Postgres connection string and set `DATABASE_URL` + `FINNHUB_API_KEY` in `backend/.env` (see `.env.example`).
3. Apply database migrations:
   - `cd backend && alembic upgrade head`
4. Run both servers:
   - Backend: `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload`
   - Frontend: `cd frontend && npm run dev`

Then open `http://localhost:5173` in the browser.

### Supabase database setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **Project Settings → Database**.
3. Under **Connection string**, choose **URI** and **Transaction pooler** (port **6543**).
4. Copy the URI and adapt it for async SQLAlchemy:
   - Change `postgresql://` to `postgresql+asyncpg://`
   - Replace `[YOUR-PASSWORD]` with your database password
   - URL-encode special characters in the password if needed

Example (replace placeholders):

```
postgresql+asyncpg://postgres.abcdefghijklmnop:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

The backend sets `statement_cache_size=0` on asyncpg connections so **Supabase’s transaction pooler (PgBouncer on port 6543)** works. Without that, you may see `DuplicatePreparedStatementError` and HTTP 500 on `/api/watchlists/` and `/api/portfolios/`.

5. Create `backend/.env` (copy from `.env.example` at the repo root):

```
FINNHUB_API_KEY=your_finnhub_key
DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Apply migrations to your Supabase database (required on first setup):

```bash
alembic upgrade head
```

Start the server:

```bash
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`

Verify database connectivity: `GET http://localhost:8000/api/health` should return `"database": "connected"`.

### Frontend

```bash
cd frontend
cp .env.example .env   # add Supabase URL + anon key
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (proxies `/api` and `/ws` to backend)

**Supabase Auth (frontend):** In Supabase Dashboard → Authentication → enable Email provider, using the same project as `backend/.env`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env`.

**Supabase Auth (backend):** Watchlist, portfolio, chat, and insider-ingest endpoints require a signed-in user, so the backend must be able to verify Supabase JWTs — set `SUPABASE_JWKS_URL` (and optionally `SUPABASE_JWT_ISSUER`) in `backend/.env`. If it is unset, those endpoints return 503 rather than silently allowing anonymous access.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stocks/trending` | Configured trending symbols |
| GET | `/api/stocks/search?q=` | Search symbols |
| GET | `/api/stocks/market/news` | Market news |
| GET | `/api/stocks/{symbol}/quote` | Real-time quote |
| GET | `/api/stocks/{symbol}/profile` | Company profile |
| GET | `/api/stocks/{symbol}/candles` | OHLCV chart data |
| GET | `/api/stocks/{symbol}/news` | Company news |
| GET | `/api/watchlists/` | List watchlists |
| POST | `/api/watchlists/` | Create watchlist |
| DELETE | `/api/watchlists/{id}` | Delete watchlist |
| POST | `/api/watchlists/{id}/items` | Add symbol to watchlist |
| PATCH | `/api/watchlists/{id}/items/{item_id}` | Update item notes |
| DELETE | `/api/watchlists/{id}/items/{item_id}` | Remove from watchlist |
| GET | `/api/portfolios/` | List portfolios |
| POST | `/api/portfolios/` | Create portfolio |
| GET | `/api/portfolios/{id}` | Single portfolio with transactions |
| GET | `/api/portfolios/{id}/summary` | Holdings and P&L (`?live_prices=true` for Finnhub fetch) |
| GET | `/api/portfolios/{id}/performance` | Historical value chart data (`?days=365`) |
| GET | `/api/stocks/quotes?symbols=` | Batch quotes for multiple symbols |
| DELETE | `/api/portfolios/{id}` | Delete portfolio |
| POST | `/api/portfolios/{id}/transactions` | Record buy/sell |
| DELETE | `/api/portfolios/{id}/transactions/{tx_id}` | Delete transaction |
| POST | `/api/chat/` | Stock expert chat (OpenAI tool-calling, auth required) |
| POST | `/api/insiders/{symbol}/ingest` | Ingest insider + ownership rows for a symbol (auth required) |
| GET | `/api/insiders/{symbol}/transactions` | Insider transactions for symbol |
| GET | `/api/insiders/{symbol}/ownership` | Institutional ownership snapshots |
| GET | `/api/insiders/feed/me` | Authenticated insider feed for user's watchlist |
| WS | `/ws/notifications?token=` | Realtime websocket notifications |

## Configuration

All settings are in `backend/.env` (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `FINNHUB_API_KEY` | (required) | Finnhub API key |
| `OPENAI_API_KEY` | (optional) | Enables `/api/chat` responses via OpenAI |
| `OPENAI_MODEL` | `gpt-4.1-mini` | OpenAI chat model for stock assistant |
| `DATABASE_URL` | `sqlite+aiosqlite:///./stock_platform.db` | Postgres (Supabase) connection string; set in `backend/.env` |
| `SUPABASE_JWKS_URL` | (required for auth) | Supabase JWKS endpoint for JWT verification; authenticated endpoints return 503 without it |
| `SUPABASE_JWT_ISSUER` | (optional) | Supabase JWT issuer URL; when set, tokens from other issuers are rejected |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `TRENDING_SYMBOLS` | `AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA` | Dashboard trending list |
| `JOBS_ENABLED` | `true` | Enable scheduler-driven ingestion jobs |
| `INSIDER_INGEST_INTERVAL_MINUTES` | `30` | Interval for watchlist insider ingestion job |

## Database Migrations

Schema changes are applied **only** through Alembic (not auto-created at app startup).

```bash
cd backend

# Create a new migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations to Supabase
alembic upgrade head
```

**Note:** Watchlists and portfolios created in an old local SQLite file are not migrated automatically. Point `DATABASE_URL` at Supabase and run `alembic upgrade head` on a fresh database, or export/import data manually if you need to keep old rows.

## Development

```bash
# Start both servers:
# Terminal 1 - Backend
cd backend && venv\Scripts\activate && uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend && npm run dev
```

The Vite dev server proxies `/api` requests to the backend automatically.

## Testing & CI

```bash
cd backend
pip install -r requirements-dev.txt
pytest          # P&L math + auth-scoping regression tests
ruff check app tests alembic
```

GitHub Actions runs the backend lint + tests and a type-checked frontend
build on every push and pull request (`.github/workflows/ci.yml`).
Optional local hooks: `pip install pre-commit && pre-commit install`.

## Architecture notes & known trade-offs

This app is designed to run as a **single backend process**. Three pieces of
state live in process memory, which is a deliberate simplicity trade-off for a
demo-scale deployment — horizontal scaling would need shared infrastructure:

- **Quote/candle cache** (`app/core/cache.py`) is an in-process TTL dict.
  Multiple workers would each hold their own copy, multiplying Finnhub API
  usage and returning inconsistent cached prices per worker. Scaling out
  would move this to Redis.
- **Background jobs** (`app/core/jobs.py`) start an APScheduler instance per
  process. More than one worker would run duplicate insider-ingestion jobs;
  scaling out would need a leader lock or a dedicated job runner.
- **WebSocket connections** (`app/core/realtime.py`) are registered
  per-process, so notifications only reach users connected to the process
  that ran the job. Scaling out would need a pub/sub backplane.

Run with `uvicorn app.main:app` (one worker, the default) — don't add
`--workers N` without addressing the above.

Other known limitations:

- The notifications WebSocket authenticates via a `?token=` query parameter
  (visible in server/proxy logs) and the client does not auto-reconnect when
  the connection drops or the auth token rotates. Refreshing the page
  reconnects.
- Historical portfolio performance approximates non-trading days with the
  previous close, and a symbol whose price fetch fails is omitted from that
  day's market value.
- `DATABASE_SSL_VERIFY=false` disables TLS certificate verification for the
  database connection entirely; it exists for local dev behind interception
  proxies and must not be used in production.
