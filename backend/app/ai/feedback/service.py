from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Recommendation
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
        # 1. Ownership & existence check
        rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
        if not rec or rec.user_id != user_id:
            raise HTTPException(status_code=404, detail="Recommendation not found")

        # Conflict check if already responded
        if rec.status in ("accepted", "completed", "skipped", "rejected", "modified"):
            raise HTTPException(
                status_code=409,
                detail=f"Recommendation has already been responded to with status '{rec.status}'",
            )

        # 2. Record feedback row in AI table
        fb = AIRepository.record_feedback(
            db,
            recommendation_id=recommendation_id,
            user_id=user_id,
            response=response,
            reason_code=reason_code,
            modified_params=modified_params,
            note=note,
        )

        action_key = "unknown"
        category = "transport"
        if rec.action:
            action_key = rec.action.action_key
            category = rec.action.category

        # 3. Update preference profile via Beta-Bernoulli update
        profile = AIRepository.get_or_create_preference_profile(db, user_id)
        current_cycle = rec.cycle or 1
        updated_profile, summary = update_preference_profile(
            profile=profile,
            action_key=action_key,
            category=category,
            response=response,
            reason_code=reason_code,
            current_cycle=current_cycle,
            modified_params=modified_params,
        )
        db.commit()

        # 4. Call T2's cross-module hook on_event
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
