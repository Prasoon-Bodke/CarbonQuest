from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.core.deps import get_db, get_current_user
from app.models import Activity, EmissionRecord, EmissionFactor
from app.schemas.activity import (
    ActivityCreate,
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
import uuid
import csv
import io
from datetime import date, datetime

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
    # 1. Validation step
    status, score, reasons, dedupe = ValidationService.validate(
        user_id=user_id,
        category=payload.category.value,
        activity_key=payload.activity_key,
        quantity=payload.quantity,
        occurred_on=str(payload.occurred_on),
        metadata=payload.metadata,
    )

    if status == "rejected":
        raise HTTPException(
            status_code=422,
            detail={"code": "ACTIVITY_REJECTED", "message": "Failed plausibility validation", "details": reasons},
        )

    # Check duplicate
    dup = db.query(Activity).filter(Activity.user_id == user_id, Activity.dedupe_hash == dedupe).first()
    if dup:
        raise HTTPException(status_code=409, detail="Duplicate activity entry detected")

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
    db.add(act)
    db.commit()
    db.refresh(act)

    # 2. Deterministic carbon engine calculation
    record = CarbonEngine.calculate_emission(db, act)

    # 3. Trigger rewards hook
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
    query = db.query(Activity).filter(Activity.user_id == user_id)
    if category:
        query = query.filter(Activity.category == category)

    total = query.count()
    items = query.order_by(Activity.occurred_on.desc()).offset(offset).limit(limit).all()

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

@router.delete("/activities/{activity_id}", tags=["Activities"])
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    act = db.query(Activity).filter(Activity.id == activity_id, Activity.user_id == user_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(act)
    db.commit()
    return {"status": "ok", "deleted_id": activity_id}
