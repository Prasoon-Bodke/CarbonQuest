from sqlalchemy.orm import Session
from app.models import Recommendation, RecommendationFeedback
from typing import Dict, Any, List
from collections import defaultdict

class AdaptiveMetricsService:
    @staticmethod
    def get_metrics(db: Session, user_id: str) -> Dict[str, Any]:
        # Query feedbacks joined with recommendations to associate with cycle
        feedbacks = (
            db.query(RecommendationFeedback, Recommendation.cycle)
            .join(Recommendation, RecommendationFeedback.recommendation_id == Recommendation.id)
            .filter(RecommendationFeedback.user_id == user_id)
            .all()
        )

        total_feedbacks = len(feedbacks)
        if total_feedbacks == 0:
            return {
                "user_id": user_id,
                "overall_acceptance_rate": 0.0,
                "trend": [],
            }

        total_accepted = sum(1 for fb, _ in feedbacks if fb.response in ("accepted", "completed", "modified"))
        overall_rate = round(total_accepted / total_feedbacks, 2)

        # Group by cycle
        by_cycle = defaultdict(list)
        for fb, cycle in feedbacks:
            c = cycle or 1
            by_cycle[c].append(fb)

        trend: List[Dict[str, Any]] = []
        for c in sorted(by_cycle.keys()):
            items = by_cycle[c]
            cycle_total = len(items)
            cycle_accepted = sum(1 for f in items if f.response in ("accepted", "completed", "modified"))
            cycle_rate = round(cycle_accepted / cycle_total, 2) if cycle_total > 0 else 0.0
            trend.append({
                "cycle": c,
                "acceptance_rate": cycle_rate,
                "total_actions": cycle_total,
            })

        return {
            "user_id": user_id,
            "overall_acceptance_rate": overall_rate,
            "trend": trend,
        }
