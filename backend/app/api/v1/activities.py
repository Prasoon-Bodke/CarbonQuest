from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid

from app.core.deps import get_db, get_current_user
from app.core.errors import AppError
from app.models import Activity, EmissionRecord, EmissionFactor
from app.repositories.activity import ActivityRepository
from app.repositories.emission import EmissionRepository
from app.repositories.profile import ProfileRepository
from app.schemas.activity import (
    ActivityCreate,
    ActivityUpdate,
    ActivityCreateResponse,
    ActivityReadItem,
    ActivityListResponse,
    EmissionResult,
    EmissionFactorRef,
)
from app.services.validation.service import ValidationService
from app.services.carbon.engine import CarbonEngine
from app.services.carbon.factors import FactorService
from app.services.rewards.service import on_event

router = APIRouter()

@router.get("/emission-factors", tags=["Emission Factors"])
def get_emission_factors(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    factors = FactorService.list_active_factors(db, category)
    return {
        "factors": [
            {
                "id": f.id,
                "category": f.category,
                "activity_key": f.activity_key,
                "unit": f.unit,
                "kg_co2e_per_unit": f.kg_co2e_per_unit,
                "region_code": f.region_code,
                "source_name": f.source_name,
                "source_url": f.source_url,
                "source_year": f.source_year,
                "version": f.version,
                "notes": f.notes,
            }
            for f in factors
        ]
    }

@router.post("/activities", response_model=ActivityCreateResponse, tags=["Activities"])
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile_repo = ProfileRepository(db)
    profile = profile_repo.get_or_create(user_id)

    # 1. Mandatory consent check
    if not profile.consent_tracking:
        raise AppError(
            code="CONSENT_REQUIRED",
            message="User tracking consent is required to log activities. Please update privacy consents in settings.",
            status_code=403,
        )

    act_repo = ActivityRepository(db)

    # 2. Rule-based plausibility validation (speed, distance, daily cap, statistical z-score)
    status, score, reasons, dedupe = ValidationService.validate(
        user_id=user_id,
        category=payload.category.value,
        activity_key=payload.activity_key,
        quantity=payload.quantity,
        occurred_on=str(payload.occurred_on),
        metadata=payload.metadata,
        db=db,
    )

    if status == "rejected":
        raise AppError(
            code="ACTIVITY_REJECTED",
            message="Activity failed physical plausibility or bound validation rules",
            status_code=422,
            details=[{"reason": r} for r in reasons],
        )

    # 3. Duplicate check
    dup = act_repo.find_duplicate(user_id, dedupe)
    if dup:
        raise AppError(
            code="DUPLICATE_ACTIVITY",
            message="Duplicate activity entry detected with identical timestamp and quantity",
            status_code=409,
        )

    act = Activity(
        id=str(uuid.uuid4()),
        user_id=user_id,
        category=payload.category.value,
        activity_key=payload.activity_key,
        quantity=payload.quantity,
        unit=payload.unit,
        occurred_on=payload.occurred_on,
        source=payload.source.value,
        metadata_json=payload.metadata,
        validation_status=status,
        validation_score=score,
        validation_reasons=reasons,
        dedupe_hash=dedupe,
    )
    act_repo.add(act)

    # 4. Deterministic carbon calculation
    record = CarbonEngine.calculate_emission(db, act)

    # 5. Cross-module rewards hook
    on_event(db, user_id, event="activity_logged", ref=act.id)

    emission_result = None
    if record and record.factor:
        factor_ref = EmissionFactorRef(
            id=record.factor.id,
            value=record.factor.kg_co2e_per_unit,
            unit=f"kg CO2e/{record.factor.unit}",
            source_name=record.factor.source_name,
            source_year=record.factor.source_year,
        )
        emission_result = EmissionResult(
            id=record.id,
            kg_co2e=record.kg_co2e,
            factor=factor_ref,
            confidence=record.confidence,
            confidence_reasons=record.confidence_reasons,
        )

    return ActivityCreateResponse(
        activity=ActivityReadItem(
            id=act.id,
            category=act.category,
            activity_key=act.activity_key,
            quantity=act.quantity,
            unit=act.unit,
            occurred_on=act.occurred_on,
            source=act.source,
            validation_status=act.validation_status,
            validation_score=act.validation_score,
            validation_reasons=act.validation_reasons,
        ),
        emission=emission_result,
    )

@router.get("/activities", response_model=ActivityListResponse, tags=["Activities"])
def list_activities(
    category: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    act_repo = ActivityRepository(db)
    items, total = act_repo.list_user_activities(user_id, category=category, limit=limit, offset=offset)

    return ActivityListResponse(
        items=[
            ActivityReadItem(
                id=a.id,
                category=a.category,
                activity_key=a.activity_key,
                quantity=a.quantity,
                unit=a.unit,
                occurred_on=a.occurred_on,
                source=a.source,
                validation_status=a.validation_status,
                validation_score=a.validation_score,
                validation_reasons=a.validation_reasons,
            )
            for a in items
        ],
        total=total,
        limit=limit,
        offset=offset,
    )

@router.patch("/activities/{activity_id}", response_model=ActivityCreateResponse, tags=["Activities"])
def update_activity(
    activity_id: str,
    payload: ActivityUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile_repo = ProfileRepository(db)
    profile = profile_repo.get_or_create(user_id)
    if not profile.consent_tracking:
        raise AppError(
            code="CONSENT_REQUIRED",
            message="User tracking consent is required to update activities",
            status_code=403,
        )

    act_repo = ActivityRepository(db)
    act = act_repo.get_by_user_and_id(user_id, activity_id)
    if not act:
        raise AppError(code="NOT_FOUND", message="Activity not found", status_code=404)

    # Determine new field values
    new_cat = payload.category.value if payload.category else act.category
    new_key = payload.activity_key if payload.activity_key else act.activity_key
    new_qty = payload.quantity if payload.quantity is not None else act.quantity
    new_unit = payload.unit if payload.unit else act.unit
    new_occ = payload.occurred_on if payload.occurred_on else act.occurred_on
    new_source = payload.source.value if payload.source else act.source
    new_meta = payload.metadata if payload.metadata is not None else act.metadata_json

    status, score, reasons, dedupe = ValidationService.validate(
        user_id=user_id,
        category=new_cat,
        activity_key=new_key,
        quantity=new_qty,
        occurred_on=str(new_occ),
        metadata=new_meta,
        db=db,
        exclude_activity_id=activity_id,
    )

    if status == "rejected":
        raise AppError(
            code="ACTIVITY_REJECTED",
            message="Updated activity failed validation rules",
            status_code=422,
            details=[{"reason": r} for r in reasons],
        )

    act.category = new_cat
    act.activity_key = new_key
    act.quantity = new_qty
    act.unit = new_unit
    act.occurred_on = new_occ
    act.source = new_source
    act.metadata_json = new_meta
    act.validation_status = status
    act.validation_score = score
    act.validation_reasons = reasons
    act.dedupe_hash = dedupe

    act_repo.update(act)

    # Recalculate emission record deterministically
    record = CarbonEngine.calculate_emission(db, act)

    emission_result = None
    if record and record.factor:
        factor_ref = EmissionFactorRef(
            id=record.factor.id,
            value=record.factor.kg_co2e_per_unit,
            unit=f"kg CO2e/{record.factor.unit}",
            source_name=record.factor.source_name,
            source_year=record.factor.source_year,
        )
        emission_result = EmissionResult(
            id=record.id,
            kg_co2e=record.kg_co2e,
            factor=factor_ref,
            confidence=record.confidence,
            confidence_reasons=record.confidence_reasons,
        )

    return ActivityCreateResponse(
        activity=ActivityReadItem(
            id=act.id,
            category=act.category,
            activity_key=act.activity_key,
            quantity=act.quantity,
            unit=act.unit,
            occurred_on=act.occurred_on,
            source=act.source,
            validation_status=act.validation_status,
            validation_score=act.validation_score,
            validation_reasons=act.validation_reasons,
        ),
        emission=emission_result,
    )

@router.delete("/activities/{activity_id}", tags=["Activities"])
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    act_repo = ActivityRepository(db)
    act = act_repo.get_by_user_and_id(user_id, activity_id)
    if not act:
        raise AppError(code="NOT_FOUND", message="Activity not found", status_code=404)
    act_repo.delete(act)
    return {"status": "ok", "deleted_id": activity_id}
