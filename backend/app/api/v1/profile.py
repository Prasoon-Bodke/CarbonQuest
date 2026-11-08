from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.repositories.profile import ProfileRepository
from app.repositories.activity import ActivityRepository
from app.schemas.profile import (
    ProfileRead,
    ProfileUpdate,
    ConsentUpdate,
    OnboardingInput,
    OnboardingResponse,
)
from app.services.validation.service import ValidationService
from app.services.carbon.engine import CarbonEngine
from app.models import Activity
from datetime import date, timedelta
import uuid

router = APIRouter()

@router.get("/me", response_model=ProfileRead, tags=["Profile"])
def get_my_profile(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    repo = ProfileRepository(db)
    profile = repo.get_or_create(user_id)
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
    repo = ProfileRepository(db)
    updates = payload.model_dump(exclude_unset=True)
    profile = repo.update_profile(user_id, updates)
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
    repo = ProfileRepository(db)
    profile = repo.update_consents(user_id, payload.consent_tracking, payload.consent_leaderboard)
    return {
        "status": "ok",
        "consent_tracking": profile.consent_tracking,
        "consent_leaderboard": profile.consent_leaderboard,
    }

@router.post("/me/onboarding", response_model=OnboardingResponse, tags=["Profile"])
def complete_onboarding(
    payload: OnboardingInput,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    CP-1 Onboarding Endpoint:
    Stores user preferences and expands baseline habits into 28 days of past dated activities
    through the standard validation and deterministic carbon engine pipeline.
    Idempotent via dedupe_hash.
    """
    profile_repo = ProfileRepository(db)
    act_repo = ActivityRepository(db)

    # 1. Update Profile Demographics & Target
    profile_updates = {
        "onboarding_done": True,
    }
    if payload.display_name is not None:
        profile_updates["display_name"] = payload.display_name
    if payload.age_band is not None:
        profile_updates["age_band"] = payload.age_band
    if payload.household_size is not None:
        profile_updates["household_size"] = payload.household_size
    if payload.monthly_target_kg is not None:
        profile_updates["monthly_target_kg"] = payload.monthly_target_kg
    if payload.preferences is not None:
        profile_updates["preferences"] = payload.preferences

    profile = profile_repo.update_profile(user_id, profile_updates)

    # 2. Expand baseline habits across past 28 days
    activities_created = 0
    today = date.today()

    for habit in payload.habits:
        # Determine frequency intervals over 28 days
        if habit.frequency == "weekly":
            # 4 entries on past weekly intervals (days -28, -21, -14, -7)
            day_offsets = [28, 21, 14, 7]
        else:
            # Daily entries across past 28 days
            day_offsets = list(range(1, 29))

        for offset in day_offsets:
            occ_date = today - timedelta(days=offset)
            occ_date_str = occ_date.isoformat()

            status, score, reasons, dedupe = ValidationService.validate(
                user_id=user_id,
                category=habit.category,
                activity_key=habit.activity_key,
                quantity=habit.quantity,
                occurred_on=occ_date_str,
                metadata=habit.metadata,
                db=db,
            )

            if status == "rejected":
                continue

            # Idempotency check: skip if duplicate already exists
            existing = act_repo.find_duplicate(user_id, dedupe)
            if existing:
                continue

            act = Activity(
                id=str(uuid.uuid4()),
                user_id=user_id,
                category=habit.category,
                activity_key=habit.activity_key,
                quantity=habit.quantity,
                unit=habit.unit,
                occurred_on=occ_date,
                source="manual",
                metadata_json=habit.metadata,
                validation_status=status,
                validation_score=score,
                validation_reasons=reasons,
                dedupe_hash=dedupe,
            )
            act_repo.add(act)
            CarbonEngine.calculate_emission(db, act)
            activities_created += 1

    return OnboardingResponse(
        status="ok",
        activities_created=activities_created,
        profile=ProfileRead(
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
        ),
    )
