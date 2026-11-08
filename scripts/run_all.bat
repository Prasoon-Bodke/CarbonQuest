@echo off
echo Starting CarbonQuest Development Environment...
start "FastAPI Backend" cmd /k "cd backend && uvicorn app.main:app --reload --port 8000"
start "Next.js Frontend" cmd /k "cd frontend && npm run dev"
echo Both services launched in separate windows.
