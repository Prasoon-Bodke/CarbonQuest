from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
import calendar

from app.models import ActionCatalog, EmissionFactor, EmissionRecord, Activity, Profile
from app.services.carbon.hotspots import HotspotService
from app.services.carbon.confidence import get_confidence_label
from app.repositories.emission import EmissionRepository
from app.repositories.profile import ProfileRepository

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
        self.confidence = round(confidence, 2)
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
    elif "cycle" in activity_key or (change_type == "shift_mode" and params.get("target_activity_key") is None):
        trips_per_week = float(params.get("trips_per_week", 2))
        trip_distance_km = float(params.get("trip_distance_km", 3.0))
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
        grid_factor = 0.82  # CEA Baseline v19
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

    # Composting wet waste
    elif "compost" in activity_key or (change_type == "shift_mode" and "compost" in str(params.get("target_activity_key", ""))):
        kg_per_week = float(params.get("kg_per_week", 3.0))
        # Landfill (0.95) vs compost (0.08) delta = 0.87 kg/kg
        waste_delta = 0.87
        monthly_saving = kg_per_week * 4.33 * waste_delta
        assumptions.append({
            "key": "compost_delta",
            "label": "Landfill to Compost Avoided Methane",
            "value": waste_delta,
            "unit": "kg CO2e/kg",
            "source": "CPCB / IPCC 2023",
        })
        confidence = 0.80

    else:
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
    Calculates savings against user's actual 30-day baseline footprint.
    Decreases confidence when user history is limited (<14 days).
    """
    action = db.query(ActionCatalog).filter(ActionCatalog.action_key == action_key).first()
    change_type = action.change_type if action else "reduce_quantity"
    merged_params = dict(action.default_params if action else {})
    if params:
        merged_params.update(params)

    # 1. Calculate user's actual 30-day baseline footprint
    thirty_days_ago = date.today() - timedelta(days=30)
    actual_rows = (
        db.query(EmissionRecord.kg_co2e, Activity.occurred_on)
        .join(Activity, EmissionRecord.activity_id == Activity.id)
        .filter(
            EmissionRecord.user_id == user_id,
            Activity.occurred_on >= thirty_days_ago,
        )
        .all()
    )

    distinct_dates = set(r[1] for r in actual_rows)
    has_sufficient_history = len(distinct_dates) >= 14

    if actual_rows:
        baseline_kg = sum(r[0] for r in actual_rows)
    else:
        profile = db.query(Profile).filter(Profile.id == user_id).first()
        baseline_kg = profile.monthly_target_kg if profile and profile.monthly_target_kg else 128.0

    calc = project_scenario(
        baseline_kg=baseline_kg,
        change_type=change_type,
        activity_key=action.activity_key if action else action_key,
        params=merged_params,
    )

    confidence = calc["confidence"]
    assumptions = list(calc["assumptions"])

    # 2. Confidence penalty if history is short (<14 days)
    if not has_sufficient_history:
        confidence = max(0.3, confidence - 0.2)
        assumptions.append({
            "key": "history_penalty",
            "label": "Limited Baseline History",
            "value": len(distinct_dates),
            "unit": "days",
            "source": "Confidence reduced by 0.20 due to <14 days of logged activity",
        })

    return SavingEstimate(
        action_key=action_key,
        baseline_kg_month=baseline_kg,
        projected_kg_month=calc["projected_kg_month"],
        saving_kg_month=calc["saving_kg_month"],
        basis="estimated",
        confidence=confidence,
        assumptions=assumptions,
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
    Computes current period total, previous period comparison, change_pct,
    and CP-2 progress fields (target_kg, target_used_pct).
    """
    today = date.fromisoformat(ref_date) if ref_date else date.today()

    if period == "week":
        start_cur = today - timedelta(days=today.weekday())
        end_cur = start_cur + timedelta(days=6)
        start_prev = start_cur - timedelta(days=7)
        end_prev = start_cur - timedelta(days=1)
    else:
        start_cur = date(today.year, today.month, 1)
        _, last_day = calendar.monthrange(today.year, today.month)
        end_cur = date(today.year, today.month, last_day)

        first_prev = (start_cur - timedelta(days=1)).replace(day=1)
        _, last_day_prev = calendar.monthrange(first_prev.year, first_prev.month)
        start_prev = first_prev
        end_prev = date(first_prev.year, first_prev.month, last_day_prev)

    repo = EmissionRepository(db)
    cur_total, cur_categories, cur_count = repo.aggregate_for_period(user_id, start_cur, end_cur)
    prev_total, _, _ = repo.aggregate_for_period(user_id, start_prev, end_prev)

    # If current period has no activities, check all-time activities for demo baseline
    if cur_count == 0:
        all_total, all_categories, all_count = repo.aggregate_for_period(user_id, date(2020, 1, 1), date(2030, 1, 1))
        if all_count > 0:
            cur_total = all_total
            cur_categories = all_categories
            cur_count = all_count

    if prev_total > 0:
        change_pct = round(((cur_total - prev_total) / prev_total) * 100, 1)
    else:
        change_pct = 0.0

    profile_repo = ProfileRepository(db)
    profile = profile_repo.get_or_create(user_id)
    target_kg = profile.monthly_target_kg or 100.0
    target_used_pct = round((cur_total / target_kg) * 100, 1) if target_kg > 0 else 0.0

    confidence = 0.75 if cur_count >= 10 else 0.60
    confidence_label = get_confidence_label(confidence)

    return {
        "period": period,
        "period_start": start_cur.isoformat(),
        "period_end": end_cur.isoformat(),
        "total_kg_co2e": round(cur_total, 3),
        "basis": "estimated",
        "by_category": cur_categories,
        "previous_period_total_kg": round(prev_total, 3) if prev_total > 0 else None,
        "change_pct": change_pct if prev_total > 0 else None,
        "target_kg": target_kg,
        "target_used_pct": target_used_pct,
        "confidence": confidence,
        "confidence_label": confidence_label,
        "activity_count": cur_count,
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
