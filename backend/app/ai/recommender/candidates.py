from sqlalchemy.orm import Session
from typing import List, Optional, Set
from app.services.carbon.impact import get_action_catalog, get_hotspots
from app.models import ActionCatalog, UserPreferenceProfile, Recommendation

class CandidateBuilder:
    @staticmethod
    def get_candidates(
        db: Session,
        user_id: str,
        profile: UserPreferenceProfile,
        current_cycle: int,
        focus_category: Optional[str] = None,
    ) -> List[ActionCatalog]:
        catalog = get_action_catalog(db)

        # 1. Check actions that the user is already doing or has accepted in active cycle
        action_stats = profile.action_stats or {}
        suppressed_keys: Set[str] = set()

        for key, stat in action_stats.items():
            if stat.get("already_doing") or stat.get("last_response") == "already_doing":
                suppressed_keys.add(key)

        # Also suppress actions already accepted/completed in the current cycle
        accepted_in_cycle = (
            db.query(Recommendation.action_id)
            .filter(
                Recommendation.user_id == user_id,
                Recommendation.cycle == current_cycle,
                Recommendation.status.in_(["accepted", "completed"]),
            )
            .all()
        )
        accepted_action_ids = {a[0] for a in accepted_in_cycle}

        candidates = [
            a for a in catalog
            if a.action_key not in suppressed_keys
            and a.id not in accepted_action_ids
        ]

        if focus_category:
            return [a for a in candidates if a.category == focus_category]

        # Prioritize candidates aligned with user's top hotspots
        try:
            hotspots = get_hotspots(db, user_id=user_id, period="month", top_n=3)
            hotspot_categories = [h.get("category") for h in hotspots if h.get("category")]
        except Exception:
            hotspot_categories = []

        # Sort candidate pool to ensure top hotspots and various difficulties are present
        def candidate_sort_key(action: ActionCatalog):
            hotspot_rank = hotspot_categories.index(action.category) if action.category in hotspot_categories else 99
            return (hotspot_rank, action.difficulty, action.action_key)

        candidates.sort(key=candidate_sort_key)
        return candidates
