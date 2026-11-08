from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid
import jwt
from app.core.config import settings
from app.core.deps import get_db
from app.core.errors import AppError
from app.repositories.profile import ProfileRepository
from app.models import Profile

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

class AuthResponseUser(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    onboarding_done: bool = False

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400
    user: AuthResponseUser

class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    display_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

def mint_supabase_jwt(user_id: str, email: str, exp_minutes: int = 60 * 24) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=exp_minutes)).timestamp()),
    }
    if not settings.SUPABASE_JWT_SECRET:
        raise AppError(code="INTERNAL", message="Supabase JWT secret not configured on backend", status_code=500)
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")

@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Registers a new user and returns a signed Supabase-compatible JWT.
    Creates or initializes their profile record in the database.
    """
    email_clean = payload.email.strip().lower()
    if not email_clean:
        raise AppError(code="VALIDATION_ERROR", message="Email is required", status_code=422)

    # Deterministic UUID for the email so re-registration references same local identity
    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"carbonquest:{email_clean}"))
    
    repo = ProfileRepository(db)
    profile = repo.get_or_create(user_id)
    if payload.display_name:
        profile = repo.update_profile(user_id, {"display_name": payload.display_name})

    token = mint_supabase_jwt(user_id=user_id, email=email_clean)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
        user=AuthResponseUser(
            id=profile.id,
            email=email_clean,
            display_name=profile.display_name,
            onboarding_done=profile.onboarding_done,
        ),
    )

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Logs in a user and returns a signed Supabase-compatible JWT.
    """
    email_clean = payload.email.strip().lower()
    if not email_clean:
        raise AppError(code="VALIDATION_ERROR", message="Email is required", status_code=422)

    # Special case: demo credentials bind to DEMO_USER_ID
    if "demo" in email_clean or email_clean == "aarav.pune@vit.edu":
        user_id = DEMO_USER_ID
    else:
        user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"carbonquest:{email_clean}"))

    repo = ProfileRepository(db)
    profile = repo.get_or_create(user_id)

    token = mint_supabase_jwt(user_id=user_id, email=email_clean)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
        user=AuthResponseUser(
            id=profile.id,
            email=email_clean,
            display_name=profile.display_name,
            onboarding_done=profile.onboarding_done,
        ),
    )

@router.post("/demo", response_model=AuthResponse)
def demo_login(db: Session = Depends(get_db)):
    """
    Instant access to the seeded Aarav Sharma demo account with 8 weeks of validated activity history.
    """
    repo = ProfileRepository(db)
    profile = repo.get_or_create(DEMO_USER_ID)
    email = "aarav.sharma@example.com"
    token = mint_supabase_jwt(user_id=DEMO_USER_ID, email=email)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
        user=AuthResponseUser(
            id=profile.id,
            email=email,
            display_name=profile.display_name or "Aarav Sharma",
            onboarding_done=profile.onboarding_done,
        ),
    )
