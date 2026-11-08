import sys
import os
import hashlib
from pathlib import Path
from datetime import date, timedelta, datetime, timezone
import uuid

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models import (
    Profile,
    UserPreferenceProfile,
    Activity,
    EmissionRecord,
    EmissionFactor,
    ActionCatalog,
    Recommendation,
    Streak,
    PointsLedger,
    Badge,
    UserBadge,
)
from app.services.carbon.engine import CarbonEngine
from app.services.validation.rules import validate_activity

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

def calc_hash(user_id: str, key: str, dt_str: str, qty: float) -> str:
    raw = f"{user_id}:{key}:{dt_str}:{qty}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def seed_demo():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("-> Seeding Realistic Demo Account (Prasoon Bodke, 8-Week Activity Stream, Pune Baseline)...")

        # 1. Profile
        profile = db.query(Profile).filter(Profile.id == DEMO_USER_ID).first()
        if not profile:
            profile = Profile(
                id=DEMO_USER_ID,
                display_name="Prasoon Bodke",
                age_band="25-34",
                region_code="IN",
                household_size=2,
                monthly_target_kg=100.0,
                preferences={
                    "ok_modes": ["bus", "metro", "bicycle", "two_wheeler"],
                    "diet": "vegetarian",
                    "budget_level": "medium",
                    "effort_level": "medium",
                },
                consent_tracking=True,
                consent_leaderboard=True,
                onboarding_done=True,
            )
            db.add(profile)
            db.commit()
        else:
            profile.consent_tracking = True
            profile.onboarding_done = True
            db.commit()

        # 2. Preference Profile (Adaptive AI state)
        pref_profile = db.query(UserPreferenceProfile).filter(UserPreferenceProfile.user_id == DEMO_USER_ID).first()
        if not pref_profile:
            pref_profile = UserPreferenceProfile(
                user_id=DEMO_USER_ID,
                action_stats={
                    "transport.shift_auto_to_bus": {"alpha": 3.0, "beta": 1.0, "last_shown_cycle": 2, "last_response": "accepted"},
                    "transport.cycle_short_commute": {"alpha": 1.0, "beta": 2.5, "last_shown_cycle": 2, "last_response": "skipped"},
                    "electricity.reduce_ac_one_hour": {"alpha": 2.0, "beta": 1.0, "last_shown_cycle": 2, "last_response": "accepted"},
                },
                category_weights={
                    "transport": 1.15,
                    "electricity": 1.05,
                    "food": 1.0,
                    "shopping": 0.95,
                    "waste": 0.90,
                },
                difficulty_tolerance=0.55,
                cost_sensitivity=0.5,
                feedback_count=12,
                model_version="1.0",
                updated_at=datetime.now(timezone.utc),
            )
            db.add(pref_profile)
            db.commit()

        # 3. 8 Weeks (56 Days) of Validated Activity Stream across 5 categories
        # Sized to generate a clear Transport hotspot (~40 kg/month) followed by Electricity (~30 kg), Food (~25 kg)
        today = date.today()
        activities_to_create = []

        for week in range(8):
            week_offset = week * 7

            # Transport: Regular petrol car commute (2 days a week) -> clear hotspot driver
            for day in [2, 5]:
                d = today - timedelta(days=week_offset + day)
                activities_to_create.append((
                    "transport",
                    "transport.car_petrol_km",
                    45.0,
                    "km",
                    d,
                    {"mode": "car", "distance_km": 45.0, "duration_min": 60},
                ))

            # Transport: Two-wheeler commuting (3 days a week)
            for day in [1, 3, 4]:
                d = today - timedelta(days=week_offset + day)
                activities_to_create.append((
                    "transport",
                    "transport.two_wheeler_petrol_km",
                    15.0,
                    "km",
                    d,
                    {"mode": "two_wheeler", "distance_km": 15.0, "duration_min": 35},
                ))

            # Transport: Weekend Auto-rickshaw trip (Saturday)
            sat = today - timedelta(days=week_offset + 6)
            activities_to_create.append((
                "transport",
                "transport.auto_cng_km",
                12.0,
                "km",
                sat,
                {"mode": "auto", "distance_km": 12.0, "duration_min": 30},
            ))

            # Electricity: AC cooling usage 2 days a week (1.5h per session)
            for day in [3, 6]:
                d = today - timedelta(days=week_offset + day)
                activities_to_create.append((
                    "electricity",
                    "electricity.ac_hours",
                    1.5,
                    "hours",
                    d,
                    {"ac_power_kw": 1.5},
                ))

            # Electricity: Weekly baseline home grid share
            grid_date = today - timedelta(days=week_offset + 3)
            activities_to_create.append((
                "electricity",
                "electricity.grid_kwh",
                12.0,
                "kWh",
                grid_date,
                {},
            ))

            # Food: Regular daily vegetarian meals (2 meals/day logged periodically)
            for day in [1, 3, 5]:
                d = today - timedelta(days=week_offset + day)
                activities_to_create.append((
                    "food",
                    "food.meal_veg",
                    4.0,
                    "meal",
                    d,
                    {},
                ))

            # Food: Weekly non-veg meal (Sunday)
            sun = today - timedelta(days=week_offset + 7)
            activities_to_create.append((
                "food",
                "food.meal_non_veg",
                2.0,
                "meal",
                sun,
                {},
            ))

            # Shopping: Bi-weekly packaging or clothing
            if week % 2 == 1:
                shop_date = today - timedelta(days=week_offset + 5)
                activities_to_create.append((
                    "shopping",
                    "shopping.delivery_package",
                    2.0,
                    "package",
                    shop_date,
                    {},
                ))

            # Waste: Weekly landfill waste disposal
            waste_date = today - timedelta(days=week_offset + 7)
            activities_to_create.append((
                "waste",
                "waste.landfill_kg",
                3.5,
                "kg",
                waste_date,
                {},
            ))

        new_acts = 0
        for cat, act_key, qty, unit_val, occ_date, meta in activities_to_create:
            dt_str = occ_date.isoformat()
            dedupe = calc_hash(DEMO_USER_ID, act_key, dt_str, qty)
            existing = db.query(Activity).filter(Activity.user_id == DEMO_USER_ID, Activity.dedupe_hash == dedupe).first()

            if not existing:
                status, score, reasons = validate_activity(cat, act_key, qty, meta)
                act = Activity(
                    id=str(uuid.uuid4()),
                    user_id=DEMO_USER_ID,
                    category=cat,
                    activity_key=act_key,
                    quantity=qty,
                    unit=unit_val,
                    occurred_on=occ_date,
                    source="manual",
                    metadata_json=meta,
                    validation_status=status,
                    validation_score=score,
                    validation_reasons=reasons,
                    dedupe_hash=dedupe,
                )
                db.add(act)
                db.commit()
                db.refresh(act)
                CarbonEngine.calculate_emission(db, act)
                new_acts += 1

        print(f"[OK] 8-week activities verified: {new_acts} created, {len(activities_to_create) - new_acts} already existed.")

        # 4. Streak
        streak = db.query(Streak).filter(Streak.user_id == DEMO_USER_ID).first()
        if not streak:
            streak = Streak(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                kind="logging",
                current=5,
                longest=14,
                last_date=today,
            )
            db.add(streak)

        # 5. Points ledger
        ledger = db.query(PointsLedger).filter(PointsLedger.user_id == DEMO_USER_ID).first()
        if not ledger:
            db.add(PointsLedger(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                delta=120,
                reason="Baseline onboarding and 8 weeks validated tracking",
                ref_type="seed",
            ))

        # 6. User badges
        for badge_key in ["first_log", "transit_hero", "consistent_streak"]:
            b = db.query(Badge).filter(Badge.key == badge_key).first()
            if b:
                ub = db.query(UserBadge).filter(UserBadge.user_id == DEMO_USER_ID, UserBadge.badge_id == b.id).first()
                if not ub:
                    db.add(UserBadge(
                        id=str(uuid.uuid4()),
                        user_id=DEMO_USER_ID,
                        badge_id=b.id,
                        awarded_at=datetime.now(timezone.utc) - timedelta(days=14),
                    ))

        # 7. Seed one accepted recommendation for Impact summary testing
        rec = db.query(Recommendation).filter(Recommendation.user_id == DEMO_USER_ID).first()
        if not rec:
            act_cat = db.query(ActionCatalog).filter(ActionCatalog.action_key == "transport.shift_auto_to_bus").first()
            if act_cat:
                db.add(Recommendation(
                    id=str(uuid.uuid4()),
                    user_id=DEMO_USER_ID,
                    action_id=act_cat.id,
                    cycle=1,
                    status="accepted",
                    estimated_saving_kg_month=14.0,
                    basis="estimated",
                    saving_assumptions=[{"label": "2 bus trips/week"}],
                    priority_rank=1,
                    score=0.88,
                    score_breakdown={"impact": 0.8, "preference": 0.9, "feasibility": 0.85, "goal_fit": 0.9, "cooldown_penalty": 0.0},
                    explanation="Transport is your largest emission hotspot. Replacing 2 weekly auto trips with municipal bus saves ~14 kg CO2e/month.",
                    explanation_source="template",
                    model_version="1.0",
                ))

        db.commit()
        print("[OK] Demo user account seeded successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_demo()
