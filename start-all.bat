@echo off
REM Start NestJS API, React frontend, and Python image search service

REM Back-end (NestJS)
start "FashionHouse API" cmd /k "cd /d back-end && npm run start:dev"

REM Front-end (Vite React app)
start "FashionHouse Frontend" cmd /k "cd /d front-end && npm run dev"

REM Python image search service (FastAPI + Uvicorn)
start "Image Search Service" cmd /k "cd /d image-service && venv\\Scripts\\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8000"

echo All services starting...
echo - API:       http://localhost:3000  (NestJS default)
echo - Frontend:  http://localhost:5173 (Vite default)
echo - Image API: http://localhost:8000


