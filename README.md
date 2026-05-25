# StockPlanner

A modern stock research and portfolio tracking platform.

## Features

- **Stock Search** — Search by symbol or company name with live dropdown results (Finnhub API)
- **Stock Detail** — Real-time quotes, company profiles, interactive candlestick/line charts, and news
- **Watchlists** — Create multiple watchlists, add/remove stocks, attach notes to items
- **Portfolio Tracking** — Record buy/sell transactions, track holdings with live P&L (realized & unrealized)
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
- SQLAlchemy + Alembic (async, SQLite for dev / PostgreSQL for prod)
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

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder (see `.env.example` at root):

```
FINNHUB_API_KEY=your_api_key_here
```

Run migrations and start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (proxies `/api` to backend)

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
| GET | `/api/portfolios/{id}/summary` | Portfolio with live P&L |
| DELETE | `/api/portfolios/{id}` | Delete portfolio |
| POST | `/api/portfolios/{id}/transactions` | Record buy/sell |
| DELETE | `/api/portfolios/{id}/transactions/{tx_id}` | Delete transaction |

## Configuration

All settings are in `backend/.env` (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `FINNHUB_API_KEY` | (required) | Finnhub API key |
| `DATABASE_URL` | `sqlite+aiosqlite:///./stock_platform.db` | Database connection |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `TRENDING_SYMBOLS` | `AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA` | Dashboard trending list |

## Database Migrations

```bash
# Create a new migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Development

```bash
# Start both servers:
# Terminal 1 - Backend
cd backend && venv\Scripts\activate && uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend && npm run dev
```

The Vite dev server proxies `/api` requests to the backend automatically.
