#!/usr/bin/env python
"""
mint_dev_token.py (DA-1)
Generates a valid short-lived Supabase JWT for local development and testing.
Uses the identical SUPABASE_JWT_SECRET as the backend runtime with aud='authenticated'.
"""
import sys
import argparse
from pathlib import Path
from datetime import datetime, timedelta, timezone
import jwt

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

def mint_token(user_id: str = DEMO_USER_ID, exp_minutes: int = 60 * 24) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "email": "prasoon.bodke@carbonquest.in",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=exp_minutes)).timestamp()),
    }
    secret = settings.SUPABASE_JWT_SECRET
    if not secret:
        raise ValueError("SUPABASE_JWT_SECRET is not configured in settings or environment.")
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token

def main():
    parser = argparse.ArgumentParser(description="Mint a development Supabase JWT token")
    parser.add_argument("--sub", default=DEMO_USER_ID, help="User ID (default: demo user)")
    parser.add_argument("--exp-minutes", type=int, default=1440, help="Expiration in minutes (default: 1440 = 24h)")
    args = parser.parse_args()

    token = mint_token(user_id=args.sub, exp_minutes=args.exp_minutes)
    print(f"User ID : {args.sub}")
    print(f"Expires : {args.exp_minutes} minutes")
    print(f"Token   :\n{token}")

if __name__ == "__main__":
    main()
