
# Personalized Skincare Web App

This project now has:
- Frontend (Vite + React) in the project root
- Backend (Express + PostgreSQL) in `backend/`

## 1) Frontend setup

1. Install dependencies:
   - `npm i`
2. Create env:
   - Copy `.env.example` to `.env`
3. Start frontend:
   - `npm run dev`

## Run Everything Together

- From project root:
  - `npm run dev:all`

This starts:
- Frontend (Vite)
- Backend (Express)
- FastAPI microservice (`backend/fastapi_service.py`)

Optional:
- To use a specific Python executable for FastAPI:
  - `set FASTAPI_PYTHON_CMD=python` (Windows CMD)
  - `$env:FASTAPI_PYTHON_CMD='python'` (PowerShell)

## 2) Backend setup

1. Go to backend folder:
   - `cd backend`
2. Install dependencies:
   - `npm i`
3. Create env:
   - Copy `.env.example` to `.env`
4. Ensure PostgreSQL is running and credentials in `.env` are correct.
5. Initialize schema from `sqlFile.sql`:
   - `npm run db:init`
6. Apply post-schema migrations (password reset compatibility + indexes):
   - `psql -h <HOST> -p <PORT> -U <USER> -d <DB_NAME> -f backend/migrations/20260312_001_password_reset_tokens_and_indexes.sql`
7. Check DB connection:
   - `npm run db:check`
8. Start backend:
   - `npm run dev`

## 3) Connection check endpoints

- API health:
  - `GET http://localhost:5000/api/health`
- Database health:
  - `GET http://localhost:5000/api/health/db`

## 4) FastAPI AI microservice (trained model)

1. Go to backend folder:
   - `cd backend`
2. Install Python dependencies:
   - `python -m pip install -r requirements-fastapi.txt`
3. (Optional) copy service env template:
   - Copy `.env.fastapi.example` values into your environment
4. Run service:
   - `python fastapi_service.py`
   - or `uvicorn fastapi_service:app --host 0.0.0.0 --port 8000`
5. Train/retrain model manually if needed:
   - `python scripts/train_fastapi_models.py`

Main endpoints:
- `GET /health`
- `GET /datasets/summary`
- `POST /predict`
- `GET /recommendations/match`
- `GET /products/search`
- `GET /routines/match`
- `GET /training/status`
- `POST /training/start` (retrain on merged master dataset)

## 5) Auth endpoints connected to DB

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

The frontend auth context now calls these backend endpoints instead of mock local-only auth.
  
