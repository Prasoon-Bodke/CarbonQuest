from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.models import ActionCatalog, EmissionFactor, EmissionRecord, Activity
from app.services.carbon.hotspots import HotspotService
from app.services.carbon.confidence import get_confidence_label
from datetime import date, datetime
import math

class SavingEstimate:
    def __init__(
        self,
        action_key: str,
        baseline_kg_month: float,
        projected_kg_month: float,
        saving_kg_month: float,
        basis: str = "estimated",
        confidence: float = 0.8,
        assumptions: Optional[List[Dict[str, Any]]] = None,
        factor_ids: Optional[List[str]] = None,
    ):
        self.action_key = action_key
        self.baseline_kg_month = round(baseline_kg_month, 3)
        self.projected_kg_month = round(projected_kg_month, 3)
        self.saving_kg_month = round(saving_kg_month, 3)
        self.basis = basis
        self.confidence = confidence
        self.assumptions = assumptions or []
        self.factor_ids = factor_ids or []

    def to_dict(self):
        return {
            "action_key": self.action_key,
            "baseline_kg_month": self.baseline_kg_month,
            "projected_kg_month": self.projected_kg_month,
            "saving_kg_month": self.saving_kg_month,
            "basis": self.basis,
            "confidence": self.confidence,
            "assumptions": self.assumptions,
            "factor_ids": self.factor_ids,
        }

def project_scenario(
    baseline_kg: float,
    change_type: str,
    activity_key: str,
    params: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Shared core scenario projector used uniformly by:
    1. What-If Simulator
    2. Recommendation Saving Estimator
    Ensures identical calculation results and zero drift.
    """
    assumptions = []
    factor_ids = []

    # Transport mode shifts
    if "shift_auto_to_bus" in activity_key or (change_type == "shift_mode" and "bus" in str(params.get("target_activity_key", ""))):
        trips_per_week = float(params.get("trips_per_week", 2))
        trip_distance_km = float(params.get("trip_distance_km", 10.0))
        # Delta: auto CNG (0.068 kg/km) vs bus (0.080 / shared factor ~ 0.038 delta savings per km)
        delta_factor = 0.038
        monthly_saving = trips_per_week * 4.33 * trip_distance_km * delta_factor
        assumptions.append({
            "key": "bus_vs_auto_delta",
            "label": "Auto to Bus Transit Factor Delta",
            "value": delta_factor,
            "unit": "kg CO2e/pkm",
            "source": "TERI / ARAI 2023",
        })
        confidence = 0.82

    # Cycling
    elif "cycle" in activity_key or change_type == "shift_mode" and params.get("target_activity_key") is None:
        trips_per_week = float(params.get("trips_per_week", 2))
        trip_distance_km = float(params.get("trip_distance_km", 3.0))
        # Displaced petrol two wheeler: 0.045 kg/km
        two_wheeler_factor = 0.045
        monthly_saving = trips_per_week * 4.33 * trip_distance_km * two_wheeler_factor
        assumptions.append({
            "key": "two_wheeler_factor",
            "label": "Motorcycle/Scooter Emission Factor",
            "value": two_wheeler_factor,
            "unit": "kg CO2e/km",
            "source": "ARAI / MoEFCC 2023",
        })
        confidence = 0.85

    # AC hours reduction
    elif "ac_hours" in activity_key or change_type == "reduce_quantity":
        delta_per_day = float(params.get("delta_per_day", -1.0))
        ac_power_kw = float(params.get("ac_power_kw", 1.5))
        grid_factor = 0.82 # CEA Baseline v19
        # Assuming 2 person household share
        hours_reduced = abs(delta_per_day)
        monthly_saving = (hours_reduced * ac_power_kw * 30.0 * grid_factor) / 2.0
        assumptions.append({
            "key": "ac_power_kw",
            "label": "AC Rated Compressor Power",
            "value": ac_power_kw,
            "unit": "kW",
            "source": "BEE 3-Star Benchmark",
        })
        assumptions.append({
            "key": "grid_factor",
            "label": "National Grid Emission Factor",
            "value": grid_factor,
            "unit": "kg CO2e/kWh",
            "source": "CEA Baseline Database v19",
        })
        confidence = 0.78

    # Plant-based diet swaps
    elif "meal" in activity_key or change_type == "swap_item":
        swaps_per_week = float(params.get("swaps_per_week", 2))
        # Non-veg (2.15) to veg (0.78) delta = 1.37 kg CO2e per meal
        meal_delta = 1.37
        monthly_saving = swaps_per_week * 4.33 * meal_delta
        assumptions.append({
            "key": "meal_delta",
            "label": "Non-Veg to Vegetarian Meal Delta",
            "value": meal_delta,
            "unit": "kg CO2e/meal",
            "source": "Poore & Nemecek Science (2018)",
        })
        confidence = 0.75

    else:
        # Default proportional estimate
        monthly_saving = baseline_kg * 0.10
        confidence = 0.70

    monthly_saving = round(monthly_saving, 1)
    projected_kg = max(0.0, round(baseline_kg - monthly_saving, 1))

    return {
        "projected_kg_month": projected_kg,
        "saving_kg_month": monthly_saving,
        "confidence": confidence,
        "assumptions": assumptions,
        "factor_ids": factor_ids,
    }

def estimate_saving(
    db: Session,
    user_id: str,
    action_key: str,
    params: Optional[Dict[str, Any]] = None,
) -> SavingEstimate:
    """
    Section 3.5 frozen interface.
    """
    action = db.query(ActionCatalog).filter(ActionCatalog.action_key == action_key).first()
    change_type = action.change_type if action else "reduce_quantity"
    merged_params = dict(action.default_params if action else {})
    if params:
        merged_params.update(params)

    # Demo baseline monthly footprint
    baseline_kg = 128.0

    calc = project_scenario(
        baseline_kg=baseline_kg,
        change_type=change_type,
        activity_key=action.activity_key if action else action_key,
        params=merged_params,
    )

    return SavingEstimate(
        action_key=action_key,
        baseline_kg_month=baseline_kg,
        projected_kg_month=calc["projected_kg_month"],
        saving_kg_month=calc["saving_kg_month"],
        basis="estimated",
        confidence=calc["confidence"],
        assumptions=calc["assumptions"],
        factor_ids=calc["factor_ids"],
    )

def get_footprint_summary(
    db: Session,
    user_id: str,
    period: str = "month",
    ref_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Section 3.5 frozen interface.
    """
    records = (
        db.query(EmissionRecord, Activity)
        .join(Activity, EmissionRecord.activity_id == Activity.id)
        .filter(EmissionRecord.user_id == user_id)
        .all()
    )

    if not records:
        # Standard seeded baseline demo numbers (128.0 kg total)
        return {
            "period": period,
            "period_start": "2026-11-01",
            "period_end": "2026-11-30",
            "total_kg_co2e": 128.0,
            "basis": "estimated",
            "by_category": [
                {"category": "transport", "kg_co2e": 40.0, "share_pct": 31.3},
                {"category": "electricity", "kg_co2e": 32.0, "share_pct": 25.0},
                {"category": "food", "kg_co2e": 28.0, "share_pct": 21.9},
                {"category": "shopping", "kg_co2e": 18.0, "share_pct": 14.1},
                {"category": "waste", "kg_co2e": 10.0, "share_pct": 7.8},
            ],
            "previous_period_total_kg": 135.0,
            "change_pct": -5.2,
            "confidence": 0.72,
            "confidence_label": "high",
            "activity_count": 41,
        }

    total_kg = sum(r[0].kg_co2e for r in records)
    cat_totals: Dict[str, float] = {}
    for r, a in records:
        cat_totals[a.category] = cat_totals.get(a.category, 0.0) + r.kg_co2e

    by_category = [
        {"category": cat, "kg_co2e": round(kg, 1), "share_pct": round((kg / max(1.0, total_kg)) * 100, 1)}
        for cat, kg in cat_totals.items()
    ]

    return {
        "period": period,
        "period_start": "2026-11-01",
        "period_end": "2026-11-30",
        "total_kg_co2e": round(total_kg, 1),
        "basis": "estimated",
        "by_category": by_category,
        "previous_period_total_kg": 135.0,
        "change_pct": -5.2,
        "confidence": 0.75,
        "confidence_label": "high",
        "activity_count": len(records),
    }

def get_hotspots(
    db: Session,
    user_id: str,
    period: str = "month",
    top_n: int = 3,
) -> List[Dict[str, Any]]:
    """
    Section 3.5 frozen interface.
    """
    return HotspotService.calculate_hotspots(db, user_id, period, top_n)

def get_action_catalog(db: Session) -> List[ActionCatalog]:
    """
    Section 3.5 frozen interface.
    """
    return db.query(ActionCatalog).filter(ActionCatalog.is_active == True).all()

def get_factor_sources(db: Session, activity_keys: List[str]) -> List[Dict[str, Any]]:
    """
    Section 3.5 frozen interface.
    """
    factors = db.query(EmissionFactor).filter(EmissionFactor.activity_key.in_(activity_keys)).all()
    results = []
    for f in factors:
        results.append({
            "activity_key": f.activity_key,
            "source_name": f.source_name,
            "source_year": f.source_year,
            "source_url": f.source_url,
            "kg_co2e_per_unit": f.kg_co2e_per_unit,
            "unit": f.unit,
        })
    return results
