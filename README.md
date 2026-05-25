# Stock Research Platform

A modern stock research platform built with:

Frontend:
- React + Vite + TypeScript
- TailwindCSS
- TanStack Query
- Zustand

Backend:
- FastAPI (async)
- PostgreSQL (cloud/local)
- SQLAlchemy + Alembic

---

# 🚀 Project Structure
```
stock-platform/
├── backend/
│   ├── app/
│   ├── alembic/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   └── package.json
```

---

# 🧠 Setup Overview

You need to setup BOTH:

1. Backend (FastAPI)
2. Frontend (React)

---

# ⚙️ BACKEND SETUP

## ✅ 1. Go to backend

```
cd backend
```

2. Create virtual environment
```
python -m venv venv
```

Activate:
```
venv\Scripts\activate
```

✅ 3. Install dependencies
```
pip install -r requirements.txt
```

✅ 4. Create .env file
```
backend/.env
```

Example:
```
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT \DATABASE

FINNHUB_API_KEY=your_api_key
```

✅ 5. Run migrations
```alembic upgrade head```

✅ 6. Start backend server
```uvicorn app.main:app --reload```

✅ 7. Test backend
Open: ```http://localhost:8000```

--- 
## 🎨 FRONTEND SETUP
✅ 1. Go to frontend
```cd frontend```

✅ 2. Install dependencies
```npm install```

✅ 3. Start frontend
```npm run dev```

✅ 4. Open app
```http://localhost:5173```


## 🔁 DAILY WORKFLOW
✅ Pull latest code
```git pull```

✅ Start project
Backend
```
cd backendvenv\Scripts\activate

uvicorn app.main:app --reload
```

Frontend
```cd frontendnpm run dev```


## 🧱 DATABASE NOTES

Uses PostgreSQL (recommended: Supabase / Neon)
Schema changes must go through Alembic


### ✅ Create migration
```alembic revision --autogenerate -m "message"```

### ✅ Apply migration
```alembic upgrade head```

## ❗ Common Issues

### 1. JSX errors

- Ensure file is .tsx
- Ensure "jsx": "react-jsx" in tsconfig


### 2. CSS import errors

- Ensure file exists: ```src/vite-env.d.ts```
- Contains:
```/// <reference types="vite/client" />declare module "*.css";```

### 3. Absolute imports not working

- Check tsconfig.json
- Restart dev server

### 4. Backend DB not connecting

- Check .env
- Check database URL
- Test /db-test


### 5. Alembic not detecting models

Ensure models are imported in: ```app/models/__init__.py```


## 🧭 DEVELOPMENT PRINCIPLES

Clean architecture (routes → services → data_access)
No business logic in routes
Use async everywhere
Use TanStack Query for API calls
Zustand only for client state
Feature-based frontend structure
Never hardcode configs