from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Profile, Activity, Recommendation, ActionLog, Simulation
from app.repositories.base import BaseRepository

class ProfileRepository(BaseRepository[Profile]):
    def __init__(self, db: Session):
        super().__init__(Profile, db)

    def get_or_create(self, user_id: str) -> Profile:
        profile = self.get_by_id(user_id)
        if not profile:
            profile = Profile(
                id=user_id,
                display_name="Aarav Sharma",
                age_band="25-34",
                region_code="IN",
                household_size=2,
                monthly_target_kg=100.0,
                preferences={"ok_modes": ["bus", "metro", "bicycle", "two_wheeler"], "diet": "vegetarian"},
                consent_tracking=True,
                consent_leaderboard=True,
                onboarding_done=False,
            )
            self.add(profile)
        return profile

    def update_profile(self, user_id: str, updates: Dict[str, Any]) -> Profile:
        profile = self.get_or_create(user_id)
        for key, val in updates.items():
            if val is not None and hasattr(profile, key):
                setattr(profile, key, val)
        return self.update(profile)

    def update_consents(self, user_id: str, consent_tracking: bool, consent_leaderboard: bool) -> Profile:
        profile = self.get_or_create(user_id)
        profile.consent_tracking = consent_tracking
        profile.consent_leaderboard = consent_leaderboard
        return self.update(profile)

    def export_data(self, user_id: str) -> Dict[str, Any]:
        profile = self.get_by_id(user_id)
        activities = self.db.query(Activity).filter(Activity.user_id == user_id).all()
        recs = self.db.query(Recommendation).filter(Recommendation.user_id == user_id).all()
        actions = self.db.query(ActionLog).filter(ActionLog.user_id == user_id).all()
        sims = self.db.query(Simulation).filter(Simulation.user_id == user_id).all()
        return {
            "profile": profile,
            "activities": activities,
            "recommendations": recs,
            "action_logs": actions,
            "simulations": sims,
        }

    def delete_all(self, user_id: str) -> bool:
        profile = self.get_by_id(user_id)
        if profile:
            self.delete(profile)
            return True
        return False
