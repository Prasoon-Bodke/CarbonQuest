from fastapi import Header, HTTPException, status
from typing import Optional
import jwt
from app.core.config import settings
from app.core.errors import AppError

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Verifies Supabase JWT access token and extracts the `sub` as `user_id`.
    In local development, if authorization header is omitted or demo token used,
    returns standard demo user id.
    """
    if not authorization:
        if settings.APP_ENV == "local":
            return DEMO_USER_ID
        raise AppError(code="UNAUTHENTICATED", message="Missing authorization header", status_code=401)

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AppError(code="UNAUTHENTICATED", message="Invalid authorization header format", status_code=401)

    token = parts[1]
    if token == "demo-token" and settings.APP_ENV == "local":
        return DEMO_USER_ID

    if not settings.SUPABASE_JWT_SECRET:
        if settings.APP_ENV == "local":
            return DEMO_USER_ID
        raise AppError(code="INTERNAL", message="Supabase JWT secret not configured", status_code=500)

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if not user_id:
            raise AppError(code="UNAUTHENTICATED", message="Token payload missing sub claim", status_code=401)
        return str(user_id)
    except jwt.ExpiredSignatureError:
        raise AppError(code="UNAUTHENTICATED", message="Access token has expired", status_code=401)
    except jwt.PyJWTError as e:
        raise AppError(code="UNAUTHENTICATED", message=f"Invalid token: {str(e)}", status_code=401)
