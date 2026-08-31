@echo off
echo ============================================================
echo Starting AI Multimodal Freight Consolidation Platform...
echo ============================================================

cd /d "%~dp0"

echo [1/2] Launching Backend API (Port 8000)...
start "Freight Backend API" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Launching Frontend Dashboard (Port 5173)...
start "Freight Frontend Dashboard" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are launching in separate windows!
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
