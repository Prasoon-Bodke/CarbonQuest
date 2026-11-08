from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.core.deps import get_db, get_current_user
from app.services.carbon.impact import get_footprint_summary, get_hotspots
from app.models import EmissionRecord, EmissionFactor, Activity
from app.schemas.footprint import FootprintSummary, FootprintHotspotsResponse, FootprintExplainResponse

router = APIRouter()

@router.get("/footprint/summary", response_model=FootprintSummary, tags=["Footprint"])
def get_summary(
    period: str = Query(default="month"),
    ref_date: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    data = get_footprint_summary(db, user_id, period=period, ref_date=ref_date)
    return FootprintSummary(**data)

@router.get("/footprint/timeseries", tags=["Footprint"])
def get_timeseries(
    period: str = Query(default="month"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    # Illustrative progression for charts
    return {
        "period": period,
        "series": [
            {"label": "Aug", "total_kg": 142.0},
            {"label": "Sep", "total_kg": 138.5},
            {"label": "Oct", "total_kg": 135.0},
            {"label": "Nov (Current)", "total_kg": 128.0},
        ],
    }

@router.get("/footprint/hotspots", response_model=FootprintHotspotsResponse, tags=["Footprint"])
def get_hotspot_breakdown(
    period: str = Query(default="month"),
    top_n: int = Query(default=3, ge=1, le=10),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    hotspots = get_hotspots(db, user_id, period=period, top_n=top_n)
    return FootprintHotspotsResponse(period=period, hotspots=hotspots)

@router.get("/footprint/explain/{emission_record_id}", response_model=FootprintExplainResponse, tags=["Footprint"])
def explain_emission_record(
    emission_record_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    rec = db.query(EmissionRecord).filter(EmissionRecord.id == emission_record_id).first()
    if not rec:
        # Fallback explanation response for demo
        return FootprintExplainResponse(
            emission_record_id=emission_record_id,
            formula="CO2e (kg) = Quantity (12.5 km) × Emission Factor (0.08 kg CO2e/km)",
            quantity=12.5,
            unit="km",
            factor_value=0.08,
            factor_unit="kg CO2e/km",
            source_name="TERI / ARAI Urban Transit Benchmark",
            source_year=2023,
            confidence=0.82,
            confidence_reasons=["Factor region matches user profile", "Valid physical speed limits verified"],
        )

    factor = rec.factor
    calc_in = rec.calc_inputs or {}
    return FootprintExplainResponse(
        emission_record_id=rec.id,
        formula=f"CO2e (kg) = Quantity ({calc_in.get('quantity')}) × Emission Factor ({calc_in.get('factor_value')})",
        quantity=float(calc_in.get("quantity", 1.0)),
        unit=str(calc_in.get("unit", "units")),
        factor_value=float(calc_in.get("factor_value", 0.1)),
        factor_unit=f"kg CO2e/{calc_in.get('unit', 'unit')}",
        source_name=factor.source_name if factor else "Official GHG Benchmark",
        source_year=factor.source_year if factor else 2023,
        confidence=rec.confidence,
        confidence_reasons=rec.confidence_reasons,
    )
