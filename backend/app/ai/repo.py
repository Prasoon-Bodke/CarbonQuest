from sqlalchemy.orm import Session
from app.models import (
    UserPreferenceProfile,
    Recommendation,
    RecommendationFeedback,
    ActionLog,
    ChatSession,
    ChatMessage,
)
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class AIRepository:
    @staticmethod
    def get_or_create_preference_profile(db: Session, user_id: str) -> UserPreferenceProfile:
        profile = db.query(UserPreferenceProfile).filter(UserPreferenceProfile.user_id == user_id).first()
        if not profile:
            profile = UserPreferenceProfile(
                user_id=user_id,
                action_stats={}, # {action_key: {alpha: 1.0, beta: 1.0, last_shown_cycle: 1, last_response: "none"}}
                category_weights={
                    "transport": 1.0,
                    "electricity": 1.0,
                    "food": 1.0,
                    "shopping": 1.0,
                    "waste": 1.0,
                },
                difficulty_tolerance=0.6,
                cost_sensitivity=0.5,
                feedback_count=0,
                model_version="1.0",
                updated_at=datetime.now(timezone.utc),
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return profile

    @staticmethod
    def save_recommendations(db: Session, recommendations: List[Recommendation]) -> None:
        for rec in recommendations:
            db.add(rec)
        db.commit()

    @staticmethod
    def get_user_recommendations(db: Session, user_id: str, status: Optional[str] = None) -> List[Recommendation]:
        query = db.query(Recommendation).filter(Recommendation.user_id == user_id)
        if status:
            query = query.filter(Recommendation.status == status)
        return query.order_by(Recommendation.cycle.desc(), Recommendation.priority_rank.asc()).all()

    @staticmethod
    def record_feedback(
        db: Session,
        recommendation_id: str,
        user_id: str,
        response: str,
        reason_code: Optional[str] = None,
        modified_params: Optional[Dict[str, Any]] = None,
        note: Optional[str] = "",
    ) -> RecommendationFeedback:
        fb = RecommendationFeedback(
            id=str(uuid.uuid4()),
            recommendation_id=recommendation_id,
            user_id=user_id,
            response=response,
            reason_code=reason_code,
            modified_params=modified_params,
            note=note or "",
        )
        db.add(fb)

        # Update recommendation status
        rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
        if rec:
            rec.status = response
            rec.responded_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(fb)
        return fb
