import sys
import os
from pathlib import Path

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
import uuid
from datetime import date, timedelta, datetime, timezone

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

def seed_demo():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("-> Seeding Realistic Demo Account (Pune Baseline ~128 kg CO2e)...")

        # 1. Profile
        profile = db.query(Profile).filter(Profile.id == DEMO_USER_ID).first()
        if not profile:
            profile = Profile(
                id=DEMO_USER_ID,
                display_name="Aarav Sharma",
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

        # 3. Activities: representative activities for the month
        today = date.today()
        sample_activities = [
            ("transport", "transport.two_wheeler_petrol_km", 18.0 * 22, "km", today - timedelta(days=2)), # ~17.8 kg
            ("transport", "transport.auto_cng_km", 10.0 * 8, "km", today - timedelta(days=5)), # ~5.4 kg
            ("transport", "transport.car_petrol_km", 90.0, "km", today - timedelta(days=12)), # ~15.6 kg
            ("electricity", "electricity.ac_hours", 20.0, "hours", today - timedelta(days=1)), # ~24.6 kg
            ("electricity", "electricity.grid_kwh", 15.0, "kWh", today - timedelta(days=3)), # ~12.3 kg
            ("food", "food.meal_veg", 35.0, "meal", today - timedelta(days=4)), # ~27.3 kg
            ("shopping", "shopping.clothing_item", 2.0, "item", today - timedelta(days=15)), # ~17.0 kg
            ("waste", "waste.landfill_kg", 10.5, "kg", today - timedelta(days=2)), # ~10.0 kg
        ]

        for cat, act_key, qty, unit_val, occ_date in sample_activities:
            existing = db.query(Activity).filter(Activity.user_id == DEMO_USER_ID, Activity.activity_key == act_key).first()
            if not existing:
                act = Activity(
                    id=str(uuid.uuid4()),
                    user_id=DEMO_USER_ID,
                    category=cat,
                    activity_key=act_key,
                    quantity=qty,
                    unit=unit_val,
                    occurred_on=occ_date,
                    source="manual",
                    metadata_json={},
                    validation_status="accepted",
                    validation_score=0.92,
                    validation_reasons=["Consistent with historical average"],
                    dedupe_hash=str(uuid.uuid4()),
                )
                db.add(act)
                db.commit()
                db.refresh(act)
                CarbonEngine.calculate_emission(db, act)

        # 4. Streak
        streak = db.query(Streak).filter(Streak.user_id == DEMO_USER_ID).first()
        if not streak:
            streak = Streak(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                kind="logging",
                current=4,
                longest=9,
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
                reason="Initial baseline onboarding and activity logs",
                ref_type="seed",
            ))

        # 6. User badge
        b = db.query(Badge).filter(Badge.key == "first_log").first()
        if b:
            ub = db.query(UserBadge).filter(UserBadge.user_id == DEMO_USER_ID, UserBadge.badge_id == b.id).first()
            if not ub:
                db.add(UserBadge(
                    id=str(uuid.uuid4()),
                    user_id=DEMO_USER_ID,
                    badge_id=b.id,
                    awarded_at=datetime(2026, 11, 2, 8, 0, 0, tzinfo=timezone.utc),
                ))

        db.commit()
        print("[OK] Demo user account seeded successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_demo()
