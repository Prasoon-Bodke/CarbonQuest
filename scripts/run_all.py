#!/usr/bin/env python3
"""
Developer helper to run both the FastAPI backend and Next.js frontend concurrently.
"""
import subprocess
import sys
import os
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent

def main():
    print("=" * 60)
    print("CarbonQuest Monorepo Local Development Launcher")
    print("=" * 60)

    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"]
    frontend_cmd = ["npm", "run", "dev"]

    print("[*] Starting FastAPI Backend on http://localhost:8000...")
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(repo_root / "backend"),
    )

    print("[*] Starting Next.js Frontend on http://localhost:3000...")
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=str(repo_root / "frontend"),
        shell=True,
    )

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n[*] Shutting down dev services...")
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    main()
