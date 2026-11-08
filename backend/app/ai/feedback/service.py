from sqlalchemy.orm import Session
from app.models import Recommendation, ActionCatalog
from app.ai.repo import AIRepository
from app.ai.adaptive.update import update_preference_profile
from app.services.rewards.service import on_event
from typing import Optional, Dict, Any

class FeedbackService:
    @staticmethod
    def process_feedback(
        db: Session,
        recommendation_id: str,
        user_id: str,
        response: str,
        reason_code: Optional[str] = None,
        modified_params: Optional[Dict[str, Any]] = None,
        note: Optional[str] = "",
    ) -> Dict[str, Any]:
        # 1. Record feedback row in AI table
        fb = AIRepository.record_feedback(
            db,
            recommendation_id=recommendation_id,
            user_id=user_id,
            response=response,
            reason_code=reason_code,
            modified_params=modified_params,
            note=note,
        )

        rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
        action_key = "unknown"
        category = "transport"
        if rec and rec.action:
            action_key = rec.action.action_key
            category = rec.action.category

        # 2. Update preference profile via Beta-Bernoulli update
        profile = AIRepository.get_or_create_preference_profile(db, user_id)
        current_cycle = rec.cycle if rec else 1
        updated_profile, summary = update_preference_profile(
            profile=profile,
            action_key=action_key,
            category=category,
            response=response,
            reason_code=reason_code,
            current_cycle=current_cycle,
        )
        db.commit()

        # 3. Call T2's cross-module hook on_event
        event_name = f"feedback_{response}"
        reward_result = on_event(db, user_id=user_id, event=event_name, ref=recommendation_id)

        return {
            "recommendation": {"id": recommendation_id, "status": response},
            "profile_update": {
                "feedback_count": updated_profile.feedback_count,
                "summary": summary,
            },
            "rewards": reward_result.to_dict(),
        }
