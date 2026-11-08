from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models import Profile
from app.schemas.profile import ProfileRead, ProfileUpdate, ConsentUpdate
import uuid

router = APIRouter()

@router.get("/me", response_model=ProfileRead, tags=["Profile"])
def get_my_profile(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        # Create default profile
        profile = Profile(
            id=user_id,
            display_name="Aarav Sharma",
            age_band="25-34",
            region_code="IN",
            household_size=2,
            monthly_target_kg=100.0,
            preferences={"ok_modes": ["bus", "bicycle", "two_wheeler"], "diet": "vegetarian"},
            consent_tracking=True,
            consent_leaderboard=True,
            onboarding_done=True,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return ProfileRead(
        id=profile.id,
        display_name=profile.display_name,
        age_band=profile.age_band,
        region_code=profile.region_code,
        household_size=profile.household_size,
        monthly_target_kg=profile.monthly_target_kg,
        preferences=profile.preferences,
        consent_tracking=profile.consent_tracking,
        consent_leaderboard=profile.consent_leaderboard,
        onboarding_done=profile.onboarding_done,
    )

@router.put("/me", response_model=ProfileRead, tags=["Profile"])
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        profile = Profile(id=user_id)
        db.add(profile)

    if payload.display_name is not None:
        profile.display_name = payload.display_name
    if payload.age_band is not None:
        profile.age_band = payload.age_band
    if payload.region_code is not None:
        profile.region_code = payload.region_code
    if payload.household_size is not None:
        profile.household_size = payload.household_size
    if payload.monthly_target_kg is not None:
        profile.monthly_target_kg = payload.monthly_target_kg
    if payload.preferences is not None:
        profile.preferences = payload.preferences

    db.commit()
    db.refresh(profile)
    return ProfileRead(
        id=profile.id,
        display_name=profile.display_name,
        age_band=profile.age_band,
        region_code=profile.region_code,
        household_size=profile.household_size,
        monthly_target_kg=profile.monthly_target_kg,
        preferences=profile.preferences,
        consent_tracking=profile.consent_tracking,
        consent_leaderboard=profile.consent_leaderboard,
        onboarding_done=profile.onboarding_done,
    )

@router.post("/me/consents", tags=["Profile"])
def set_consents(
    payload: ConsentUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        profile = Profile(id=user_id)
        db.add(profile)

    profile.consent_tracking = payload.consent_tracking
    profile.consent_leaderboard = payload.consent_leaderboard
    db.commit()

    return {"status": "ok", "consent_tracking": profile.consent_tracking, "consent_leaderboard": profile.consent_leaderboard}
